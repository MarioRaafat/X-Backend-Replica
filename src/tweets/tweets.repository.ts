import { Repository } from 'typeorm';
import { Tweet, TweetLike, TweetReply, TweetRepost } from './entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { TimelineResponseDto } from 'src/timeline/dto/timeline-response.dto';
import { TimelinePaginationDto } from 'src/timeline/dto/timeline-pagination.dto';
import { TweetResponseDTO } from './dto';
import { TweetType } from './dto/tweet-response.dto';

@Injectable()
export class TweetsRepository {
    constructor(
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetLike)
        private readonly tweet_like_repository: Repository<TweetLike>,
        @InjectRepository(TweetRepost)
        private readonly tweet_repost_repository: Repository<TweetRepost>
    ) {}

    async getFollowingTweets(
        user_id: string,
        pagination: TimelinePaginationDto
    ): Promise<{ tweets: TweetResponseDTO[]; next_cursor: string | null }> {
        const query_builder = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .leftJoin('tweet_replies', 'reply', 'reply.reply_tweet_id = tweet.tweet_id')
            .leftJoin('tweet_quotes', 'quote', 'quote.quote_tweet_id = tweet.tweet_id')
            .leftJoinAndSelect(
                'tweets',
                'parent_tweet',
                'parent_tweet.tweet_id = COALESCE(reply.original_tweet_id, quote.original_tweet_id)'
            )
            .leftJoinAndSelect('parent_tweet.user', 'parent_user')
            .addSelect(
                `CASE 
                WHEN reply.reply_tweet_id IS NOT NULL THEN 'reply'
                WHEN quote.quote_tweet_id IS NOT NULL THEN 'quote'
                ELSE 'tweet'
            END`,
                'tweet_type'
            )
            .addSelect(
                'COALESCE(reply.original_tweet_id, quote.original_tweet_id)',
                'parent_tweet_id'
            )
            .addSelect(
                `(
                WITH RECURSIVE conversation_tree AS (
                    -- Base case: start with current tweet if it's a reply
                    SELECT 
                        reply.reply_tweet_id,
                        reply.original_tweet_id,
                        reply.original_tweet_id as root_id,
                        1 as depth
                    FROM tweet_replies reply
                    WHERE reply.reply_tweet_id = tweet.tweet_id
                    
                    UNION ALL
                    
                    -- Recursive case: go up the reply chain
                    SELECT 
                        ct.reply_tweet_id,
                        tr.original_tweet_id,
                        tr.original_tweet_id,
                        ct.depth + 1
                    FROM conversation_tree ct
                    INNER JOIN tweet_replies tr ON ct.root_id = tr.reply_tweet_id
                    WHERE ct.depth < 100  -- Prevent infinite loops
                )
                SELECT root_id
                FROM conversation_tree
                ORDER BY depth DESC
                LIMIT 1
            )`,
                'conversation_root_id'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM tweet_likes 
                WHERE tweet_likes.tweet_id = tweet.tweet_id 
                AND tweet_likes.user_id = :user_id
            )`,
                'is_liked'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM tweet_reposts 
                WHERE tweet_reposts.tweet_id = tweet.tweet_id 
                AND tweet_reposts.user_id = :user_id
            )`,
                'is_reposted'
            )
            .where(
                `tweet.user_id IN(
                SELECT followed_id 
                FROM user_follows
                WHERE follower_id=:user_id
            )`,
                { user_id }
            )
            .andWhere(
                `tweet.user_id NOT IN(
                SELECT muted_id 
                FROM user_mutes
                WHERE muter_id=:user_id
            )`,
                { user_id }
            )
            .orderBy('tweet.created_at', 'DESC')
            .limit(pagination.limit);

        if (pagination.cursor) {
            const [cursor_timestamp, cursor_id] = pagination.cursor.split('_');
            if (cursor_timestamp && cursor_id) {
                query_builder.andWhere(
                    '(tweet.created_at < :cursor_timestamp OR (tweet.created_at = :cursor_timestamp AND tweet.tweet_id < :cursor_id))',
                    { cursor_timestamp, cursor_id }
                );
            }
        }

        const raw_results = await query_builder.getRawMany();

        const tweets: TweetResponseDTO[] = raw_results.map((row) => {
            const tweet: TweetResponseDTO = {
                tweet_id: row.tweet_tweet_id,
                type: row.tweet_type as TweetType,
                content: row.tweet_content,
                conversation_id: row.conversation_root_id,
                images: row.tweet_images || [],
                videos: row.tweet_videos || [],
                user: {
                    id: row.user_id,
                    name: row.user_name,
                    username: row.user_username,
                    avatar_url: row.user_avatar_url,
                    verified: row.user_verified,
                },
                likes_count: row.tweet_num_likes,
                reposts_count: row.tweet_num_reposts,
                quotes_count: row.tweet_num_quotes,
                replies_count: row.tweet_num_replies,
                views_count: row.tweet_num_views,
                is_liked: row.is_liked === true,
                is_reposted: row.is_reposted === true,
                created_at: row.tweet_created_at,
                updated_at: row.tweet_updated_at,
            };

            if (row.parent_tweet_id && row.parent_user_id) {
                tweet.parent_tweet_id = row.parent_tweet_id;
                tweet.parent_tweet = {
                    tweet_id: row.parent_tweet_tweet_id,
                    type: 'tweet',
                    content: row.parent_tweet_content,
                    images: row.parent_tweet_images || [],
                    videos: row.parent_tweet_videos || [],
                    user: {
                        id: row.parent_user_id,
                        name: row.parent_user_name,
                        username: row.parent_user_username,
                        avatar_url: row.parent_user_avatar_url,
                        verified: row.parent_user_verified,
                    },
                    likes_count: row.parent_tweet_num_likes,
                    reposts_count: row.parent_tweet_num_reposts,
                    quotes_count: row.parent_tweet_num_quotes,
                    replies_count: row.parent_tweet_num_replies,
                    views_count: row.parent_tweet_num_views,
                    is_liked: false,
                    is_reposted: false,
                    created_at: row.parent_tweet_created_at,
                    updated_at: row.parent_tweet_updated_at,
                };
            }

            return tweet;
        });

        const next_cursor =
            tweets.length > 0 && tweets.length === pagination.limit
                ? `${tweets[tweets.length - 1].created_at.toISOString()}_${tweets[tweets.length - 1].tweet_id}`
                : null;

        return { tweets, next_cursor };
    }

    async getForyouTweets(
        user_id: string,
        pagination: TimelinePaginationDto
    ): Promise<{ tweets: TweetResponseDTO[]; next_cursor: string | null }> {
        const limit = pagination.limit ?? 50;

        const query_builder = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .leftJoin('tweet_quotes', 'quote', 'quote.quote_tweet_id = tweet.tweet_id')
            .leftJoinAndSelect(
                'tweets',
                'parent_tweet',
                'parent_tweet.tweet_id = quote.original_tweet_id'
            )
            .leftJoinAndSelect('parent_tweet.user', 'parent_user')
            .addSelect(
                `CASE 
                WHEN quote.quote_tweet_id IS NOT NULL THEN 'quote'
                ELSE 'tweet'
            END`,
                'tweet_type'
            )
            .addSelect('quote.original_tweet_id', 'parent_tweet_id')
            .addSelect(
                `EXISTS(
                SELECT 1 FROM tweet_likes 
                WHERE tweet_likes.tweet_id = tweet.tweet_id 
                AND tweet_likes.user_id = :user_id
            )`,
                'is_liked'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM tweet_reposts 
                WHERE tweet_reposts.tweet_id = tweet.tweet_id 
                AND tweet_reposts.user_id = :user_id
            )`,
                'is_reposted'
            )
            .orderBy('RANDOM()')
            .limit(limit)
            .setParameters({ user_id });

        if (pagination.cursor) {
            const [cursor_timestamp, cursor_id] = pagination.cursor.split('_');
            if (cursor_timestamp && cursor_id) {
                query_builder.andWhere(
                    '(tweet.created_at < :cursor_timestamp OR (tweet.created_at = :cursor_timestamp AND tweet.tweet_id < :cursor_id))',
                    { cursor_timestamp, cursor_id }
                );
            }
        }

        const raw_results = await query_builder.getRawMany();

        const tweets: TweetResponseDTO[] = raw_results.map((row) => {
            const tweet: TweetResponseDTO = {
                tweet_id: row.tweet_tweet_id,
                type: row.tweet_type as TweetType,
                content: row.tweet_content,
                images: row.tweet_images || [],
                videos: row.tweet_videos || [],
                user: {
                    id: row.user_id,
                    name: row.user_name,
                    username: row.user_username,
                    avatar_url: row.user_avatar_url,
                    verified: row.user_verified,
                },
                likes_count: row.tweet_num_likes,
                reposts_count: row.tweet_num_reposts,
                quotes_count: row.tweet_num_quotes,
                replies_count: row.tweet_num_replies,
                views_count: row.tweet_num_views,
                is_liked: row.is_liked === true,
                is_reposted: row.is_reposted === true,
                created_at: row.tweet_created_at,
                updated_at: row.tweet_updated_at,
            };

            if (row.parent_tweet_id && row.parent_user_id) {
                tweet.parent_tweet_id = row.parent_tweet_id;
                tweet.parent_tweet = {
                    tweet_id: row.parent_tweet_tweet_id,
                    type: 'tweet',
                    content: row.parent_tweet_content,
                    images: row.parent_tweet_images || [],
                    videos: row.parent_tweet_videos || [],
                    user: {
                        id: row.parent_user_id,
                        name: row.parent_user_name,
                        username: row.parent_user_username,
                        avatar_url: row.parent_user_avatar_url,
                        verified: row.parent_user_verified,
                    },
                    likes_count: row.parent_tweet_num_likes,
                    reposts_count: row.parent_tweet_num_reposts,
                    quotes_count: row.parent_tweet_num_quotes,
                    replies_count: row.parent_tweet_num_replies,
                    views_count: row.parent_tweet_num_views,
                    is_liked: false,
                    is_reposted: false,
                    created_at: row.parent_tweet_created_at,
                    updated_at: row.parent_tweet_updated_at,
                };
            }

            return tweet;
        });

        const next_cursor =
            tweets.length > 0 && tweets.length === limit
                ? `${tweets[tweets.length - 1].created_at.toISOString()}_${tweets[tweets.length - 1].tweet_id}`
                : null;

        return { tweets, next_cursor };
    }
}
