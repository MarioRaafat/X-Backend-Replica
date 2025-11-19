import { DataSource, Repository } from 'typeorm';
import { Tweet, TweetLike, TweetReply, TweetRepost } from './entities';
import { TweetBookmark } from './entities/tweet-bookmark.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { TimelineResponseDto } from 'src/timeline/dto/timeline-response.dto';
import { TimelinePaginationDto } from 'src/timeline/dto/timeline-pagination.dto';
import { TweetResponseDTO } from './dto';
import { TweetType } from 'src/shared/enums/tweet-types.enum';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { plainToInstance } from 'class-transformer';
import { UserFollows } from 'src/user/entities';
import { getReplyWithParentChainQuery } from './queries/reply-parent-chain.query';
import { getPostsByUserIdQuery } from './queries/get-posts-by-userId.query';
import { SelectQueryBuilder } from 'typeorm/browser';

@Injectable()
export class TweetsRepository {
    constructor(
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetLike)
        private readonly tweet_like_repository: Repository<TweetLike>,
        @InjectRepository(TweetRepost)
        private readonly tweet_repost_repository: Repository<TweetRepost>,
        private readonly paginate_service: PaginationService,
        private data_source: DataSource
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
                'tweet_reposts',
                'repost',
                'repost.tweet_id = tweet.tweet_id  AND ( repost.user_id IN (SELECT followed_id FROM user_follows WHERE follower_id = :user_id) or repost.user_id = :user_id )'
            )
            .leftJoinAndSelect('user', 'repost_user', 'repost_user.id = repost.user_id')
            .leftJoinAndSelect(
                'tweets',
                'parent_tweet',
                'parent_tweet.tweet_id = COALESCE(reply.original_tweet_id, quote.original_tweet_id)'
            )
            .leftJoinAndSelect('parent_tweet.user', 'parent_user')
            .addSelect(
                `CASE 
                WHEN repost.user_id IS NOT NULL THEN 'repost'
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

            //TODO: This will be removed as we store converstion id but till i fill the database again
            .addSelect(
                `(
                WITH RECURSIVE conversation_tree AS (
                    SELECT 
                        reply.reply_tweet_id,
                        reply.original_tweet_id,
                        reply.original_tweet_id as root_id,
                        1 as depth
                    FROM tweet_replies reply
                    WHERE reply.reply_tweet_id = tweet.tweet_id
                    
                    UNION ALL
                    
                    SELECT 
                        ct.reply_tweet_id,
                        tr.original_tweet_id,
                        tr.original_tweet_id,
                        ct.depth + 1
                    FROM conversation_tree ct
                    INNER JOIN tweet_replies tr ON ct.root_id = tr.reply_tweet_id
                    WHERE ct.depth < 100
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
            .addSelect(
                `EXISTS(
                SELECT 1 FROM tweet_bookmarks 
                WHERE tweet_bookmarks.tweet_id = tweet.tweet_id 
                AND tweet_bookmarks.user_id = :user_id
            )`,
                'is_bookmarked'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM user_follows             
                WHERE follower_id = :user_id
                AND followed_id = tweet.user_id)`,
                'is_following'
            )
            .where(
                `(tweet.user_id = :user_id
     OR tweet.user_id IN (
        SELECT followed_id 
        FROM user_follows
        WHERE follower_id = :user_id
    )
    OR repost.user_id IS NOT NULL)`
            )
            .andWhere(
                `tweet.user_id NOT IN(
                SELECT muted_id 
                FROM user_mutes
                WHERE muter_id=:user_id
            )`
            )
            .orderBy('COALESCE(repost.created_at, tweet.created_at)', 'DESC')
            .limit((pagination.limit ?? 20) + 1)
            .setParameters({ user_id });

        // This will be delegated to a pagination service

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
        const all_tweets = this.mapRawTweetsToDTOs(raw_results);

        const limit = pagination.limit ?? 20;
        const has_more = all_tweets.length > limit;
        const tweets = has_more ? all_tweets.slice(0, limit) : all_tweets;

        const next_cursor = has_more
            ? `${tweets[tweets.length - 1].created_at.toISOString()}_${tweets[tweets.length - 1].tweet_id}`
            : null;

        return { tweets, next_cursor };
    }

    async getForyouTweets(
        user_id: string,
        pagination: TimelinePaginationDto
    ): Promise<{ tweets: TweetResponseDTO[]; next_cursor: string | null }> {
        const query_builder = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .leftJoin('tweet_quotes', 'quote', 'quote.quote_tweet_id = tweet.tweet_id')
            .leftJoinAndSelect('tweet_reposts', 'repost', 'repost.tweet_id = tweet.tweet_id')
            .leftJoinAndSelect('user', 'repost_user', 'repost_user.id = repost.user_id')
            .leftJoinAndSelect(
                'tweets',
                'parent_tweet',
                'parent_tweet.tweet_id = quote.original_tweet_id'
            )
            .leftJoinAndSelect('parent_tweet.user', 'parent_user')
            .addSelect(
                `CASE 
                WHEN repost.user_id IS NOT NULL THEN 'repost'
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
            .addSelect(
                `EXISTS(
                SELECT 1 FROM tweet_bookmarks 
                WHERE tweet_bookmarks.tweet_id = tweet.tweet_id 
                AND tweet_bookmarks.user_id = :user_id
            )`,
                'is_bookmarked'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM user_follows             
                WHERE follower_id = :user_id
                AND followed_id = tweet.user_id)`,
                'is_following'
            )
            .orderBy('RANDOM()')
            .limit((pagination.limit ?? 20) + 1)
            .setParameters({ user_id });

        // This will be delegated to a pagination service

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
        const all_tweets = this.mapRawTweetsToDTOs(raw_results);

        const limit = pagination.limit ?? 20;
        const has_more = all_tweets.length > limit;
        const tweets = has_more ? all_tweets.slice(0, limit) : all_tweets;

        const next_cursor = has_more
            ? `${tweets[tweets.length - 1].created_at.toISOString()}_${tweets[tweets.length - 1].tweet_id}`
            : null;

        return { tweets, next_cursor };
    }

    //TODO: I will use tweets mapper later
    private mapRawTweetsToDTOs(raw_results: any[]): TweetResponseDTO[] {
        return raw_results.map((row) => {
            const tweet: TweetResponseDTO = {
                tweet_id: row.tweet_tweet_id,
                type: row.tweet_type as TweetType,
                content: row.tweet_content,
                // conversation_id: row.conversation_root_id,
                images: row.tweet_images || [],
                videos: row.tweet_videos || [],
                user: {
                    id: row.user_id,
                    name: row.user_name,
                    username: row.user_username,
                    avatar_url: row.user_avatar_url,
                    verified: row.user_verified,
                    bio: row.user_bio,
                    cover_url: row.user_cover_url,
                    followers: row.user_followers,
                    following: row.user_following,
                    is_following: row.is_following === true,
                },
                likes_count: row.tweet_num_likes,
                reposts_count: row.tweet_num_reposts,
                quotes_count: row.tweet_num_quotes,
                replies_count: row.tweet_num_replies,
                views_count: row.tweet_num_views,
                bookmarks_count: row.tweet_num_bookmarks || 0,
                is_liked: row.is_liked === true,
                is_reposted: row.is_reposted === true,
                is_bookmarked: row.is_bookmarked === true,
                created_at: row.tweet_created_at,
                updated_at: row.tweet_updated_at,
            };

            //  parent tweet info if it is a quote or reply
            if (row.parent_tweet_id && row.parent_user_id) {
                tweet.parent_tweet_id = row.parent_tweet_id;
                // tweet.parent_tweet = {
                //     tweet_id: row.parent_tweet_tweet_id,
                //     type: 'tweet',
                //     content: row.parent_tweet_content,
                //     images: row.parent_tweet_images || [],
                //     videos: row.parent_tweet_videos || [],
                //     user: {
                //         id: row.parent_user_id,
                //         name: row.parent_user_name,
                //         username: row.parent_user_username,
                //         avatar_url: row.parent_user_avatar_url,
                //         verified: row.parent_user_verified,
                //         bio: row.parent_user_bio,
                //         cover_url: row.parent_user_cover_url,
                //         followers: row.parent_user_followers,
                //         following: row.parent_user_following,
                //     },
                //     likes_count: row.parent_tweet_num_likes,
                //     reposts_count: row.parent_tweet_num_reposts,
                //     quotes_count: row.parent_tweet_num_quotes,
                //     replies_count: row.parent_tweet_num_replies,
                //     views_count: row.parent_tweet_num_views,
                //     is_liked: false,
                //     is_reposted: false,
                //     created_at: row.parent_tweet_created_at,
                //     updated_at: row.parent_tweet_updated_at,
                // };
            }
            // reposted_by info if this is a repost
            if (row.repost_id && row.repost_user_id) {
                tweet.reposted_by = {
                    repost_id: row.repost_id,
                    id: row.repost_user_id,
                    name: row.repost_user_name,
                    reposted_at: row.repost_created_at,
                };
            }

            return tweet;
        });
    }

    //just for now, till we make refactoring for tweets mapper
    private mapRawTweetsToRepliesDTOs(raw_results: any[]): TweetResponseDTO[] {
        return raw_results.map((row) => {
            const tweet: TweetResponseDTO = {
                tweet_id: row.tweet_tweet_id,
                type: row.tweet_type as TweetType,
                content: row.tweet_content,
                // conversation_id: row.conversation_root_id,
                images: row.tweet_images || [],
                videos: row.tweet_videos || [],
                user: {
                    id: row.user_id,
                    name: row.user_name,
                    username: row.user_username,
                    avatar_url: row.user_avatar_url,
                    verified: row.user_verified,
                    bio: row.user_bio,
                    cover_url: row.user_cover_url,
                    followers: row.user_followers,
                    following: row.user_following,
                },
                likes_count: row.tweet_num_likes,
                reposts_count: row.tweet_num_reposts,
                quotes_count: row.tweet_num_quotes,
                replies_count: row.tweet_num_replies,
                views_count: row.tweet_num_views,
                bookmarks_count: row.tweet_num_bookmarks || 0,
                is_liked: row.is_liked === true,
                is_reposted: row.is_reposted === true,
                is_bookmarked: row.is_bookmarked === true,
                created_at: row.tweet_created_at,
                updated_at: row.tweet_updated_at,
            };

            // For replies endpoint, we only include parent_tweet_id but skip parent_tweet object
            // This keeps the response clean and allows client to fetch parent details separately if needed
            if (row.parent_tweet_id) {
                tweet.parent_tweet_id = row.parent_tweet_id;
                // Intentionally skipping parent_tweet object to keep replies response simple
            }

            // reposted_by info if this is a repost (though unlikely for replies)
            if (row.repost_id && row.repost_user_id) {
                tweet.reposted_by = {
                    repost_id: row.repost_id,
                    id: row.repost_user_id,
                    name: row.repost_user_name,
                    reposted_at: row.repost_created_at,
                };
            }

            return tweet;
        });
    }

    async getReplies(
        tweet_id: string,
        user_id: string,
        pagination: TimelinePaginationDto,
        original_tweet_owner_id?: string
    ): Promise<{ tweets: TweetResponseDTO[]; next_cursor: string | null }> {
        // Note: I will skip parent object data for replies to keep response clean as the front will have that info already
        const query_builder = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .leftJoin('tweet_replies', 'reply', 'reply.reply_tweet_id = tweet.tweet_id')
            .addSelect(
                `CASE 
                WHEN reply.reply_tweet_id IS NOT NULL THEN 'reply'
                ELSE 'tweet'
            END`,
                'tweet_type'
            )
            .addSelect('reply.original_tweet_id', 'parent_tweet_id')
            .addSelect(
                `(
                WITH RECURSIVE conversation_tree AS (
                    SELECT 
                        reply.reply_tweet_id,
                        reply.original_tweet_id,
                        reply.original_tweet_id as root_id,
                        1 as depth
                    FROM tweet_replies reply
                    WHERE reply.reply_tweet_id = tweet.tweet_id
                    
                    UNION ALL
                    
                    SELECT 
                        ct.reply_tweet_id,
                        tr.original_tweet_id,
                        tr.original_tweet_id,
                        ct.depth + 1
                    FROM conversation_tree ct
                    INNER JOIN tweet_replies tr ON ct.root_id = tr.reply_tweet_id
                    WHERE ct.depth < 100
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
            .addSelect(
                `EXISTS(
                SELECT 1 FROM tweet_bookmarks 
                WHERE tweet_bookmarks.tweet_id = tweet.tweet_id 
                AND tweet_bookmarks.user_id = :user_id
            )`,
                'is_bookmarked'
            )
            .where('reply.original_tweet_id = :tweet_id')
            .andWhere(
                `tweet.user_id NOT IN(
                SELECT muted_id 
                FROM user_mutes
                WHERE muter_id = :user_id
            )`
            )
            .orderBy('tweet.created_at', 'DESC')
            .limit((pagination.limit ?? 20) + 1)
            .setParameters({ user_id, tweet_id });

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
        const all_tweets = this.mapRawTweetsToRepliesDTOs(raw_results);

        const limit = pagination.limit ?? 20;
        const has_more = all_tweets.length > limit;
        const tweets = has_more ? all_tweets.slice(0, limit) : all_tweets;

        // If original_tweet_owner_id is provided, fetch nested replies from the owner for each reply
        if (original_tweet_owner_id) {
            const tweets_with_nested = await Promise.all(
                tweets.map(async (reply) => {
                    if (reply.replies_count > 0) {
                        // Fetch nested replies to this reply
                        const nested_replies_result = await this.getReplies(
                            reply.tweet_id,
                            user_id,
                            { limit: 1 }
                        );

                        // Find first reply from original tweet owner
                        const owner_reply = nested_replies_result.tweets.find(
                            (nested_reply) => nested_reply.user.id === original_tweet_owner_id
                        );

                        if (owner_reply) {
                            reply.replies = {
                                data: [owner_reply],
                                count: 1,
                                next_cursor: null,
                                has_more: reply.replies_count > 1,
                            };
                        }
                    }
                    return reply;
                })
            );

            const next_cursor = has_more
                ? this.paginate_service.generateNextCursor(
                      tweets_with_nested,
                      'created_at',
                      'tweet_id'
                  )
                : null;

            return { tweets: tweets_with_nested, next_cursor };
        }

        const next_cursor = has_more
            ? this.paginate_service.generateNextCursor(tweets, 'created_at', 'tweet_id')
            : null;

        return { tweets, next_cursor };
    }

    /**************************** Alyaa ****************************/
    async getPostsByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        next_cursor: string | null;
        has_more: boolean;
    }> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();

        try {
            // Parse cursor if provided
            let cursor_condition = '';
            let cursor_params: any[] = [];

            if (cursor) {
                const [cursor_date_str, cursor_id] = cursor.split('_');
                const cursor_date = new Date(cursor_date_str);

                cursor_condition = `AND (post.post_date < $${current_user_id ? '3' : '2'} OR (post.post_date = $${current_user_id ? '3' : '2'} AND post.id < $${current_user_id ? '4' : '3'}))`;
                cursor_params = [cursor_date, cursor_id];
            }

            // Build base query
            const query_string = getPostsByUserIdQuery(cursor_condition, limit, current_user_id);

            // Build params array
            let params: any[];
            if (current_user_id) params = [user_id, current_user_id, ...cursor_params];
            else params = [user_id, ...cursor_params];

            // Execute query using query runner
            const posts = await query_runner.query(query_string, params);

            // Transform to DTOs
            const tweet_dtos = posts.map((post: any) => {
                const dto = plainToInstance(
                    TweetResponseDTO,
                    {
                        tweet_id: post.tweet_id,
                        user_id: post.tweet_author_id,
                        type: post.tweet_type || post.type || 'tweet',
                        content: post.content,
                        images: post.images,
                        videos: post.videos,
                        num_likes: post.num_likes,
                        num_reposts: post.num_reposts,
                        num_views: post.num_views,
                        num_quotes: post.num_quotes,
                        num_replies: post.num_replies,
                        created_at: post.created_at,
                        updated_at: post.updated_at,
                        current_user_like:
                            current_user_id && post.is_liked ? { user_id: current_user_id } : null,
                        current_user_repost:
                            current_user_id && post.is_reposted
                                ? { user_id: current_user_id }
                                : null,
                        user: post.user,
                    },
                    {
                        excludeExtraneousValues: true,
                    }
                );

                // Add reposted_by information if this is a repost
                if (post.post_type === 'repost' && post.reposted_by_user) {
                    dto.reposted_by = {
                        repost_id: post.id,
                        id: post.reposted_by_user.id,
                        name: post.reposted_by_user.name,
                        reposted_at: post.post_date,
                    };
                }

                return dto;
            });

            // Generate next cursor using pagination service
            const next_cursor = this.paginate_service.generateNextCursor(posts, 'post_date', 'id');

            return {
                data: tweet_dtos,
                next_cursor,
                has_more: posts.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async getRepliesByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        next_cursor: string | null;
        has_more: boolean;
    }> {
        try {
            // Build query for replies by user
            let query = this.tweet_repository
                .createQueryBuilder('tweet')
                .innerJoin('tweet_replies', 'reply', 'reply.reply_tweet_id = tweet.tweet_id')
                .leftJoinAndSelect('tweet.user', 'user')
                .where('tweet.user_id = :user_id', { user_id })
                .andWhere('tweet.type = :type', { type: TweetType.REPLY })
                .orderBy('tweet.created_at', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .take(limit);

            // Add interaction flags if current_user_id is provided
            query = this.attachUserTweetInteractionFlags(query, current_user_id, 'tweet');

            // Apply cursor pagination
            this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'tweet',
                'created_at',
                'tweet_id'
            );

            const replies = await query.getMany();

            // Transform to DTOs
            const reply_dtos = replies.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            // Generate next cursor
            const next_cursor = this.paginate_service.generateNextCursor(
                replies,
                'created_at',
                'tweet_id'
            );

            return {
                data: reply_dtos,
                next_cursor,
                has_more: replies.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getMediaByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        next_cursor: string | null;
        has_more: boolean;
    }> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();

        try {
            // Parse cursor if provided
            let cursor_condition = '';
            let cursor_params: any[] = [];

            if (cursor) {
                const [cursor_date_str, cursor_id] = cursor.split('_');
                const cursor_date = new Date(cursor_date_str);

                cursor_condition = `AND (t.created_at < $${current_user_id ? '3' : '2'} OR (t.created_at = $${current_user_id ? '3' : '2'} AND t.tweet_id < $${current_user_id ? '4' : '3'}))`;
                cursor_params = [cursor_date, cursor_id];
            }

            // Build query for tweets with media (images or videos)
            const query_string = `
                SELECT 
                    t.*,
                    json_build_object(
                        'id', u.id,
                        'username', u.username,
                        'name', u.name,
                        'avatar_url', u.avatar_url,
                        'verified', u.verified,
                        'bio', u.bio,
                        'cover_url', u.cover_url,
                        'followers', u.followers,
                        'following', u.following
                    ) as user
                    ${
                        current_user_id
                            ? `,
                        CASE WHEN likes.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_liked,
                        CASE WHEN reposts.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_reposted,
                        CASE WHEN follows.follower_id IS NOT NULL THEN TRUE ELSE FALSE END as is_following
                    `
                            : ''
                    }
                FROM tweets t
                LEFT JOIN "user" u ON u.id = t.user_id
                ${
                    current_user_id
                        ? `
                    LEFT JOIN tweet_likes likes ON likes.tweet_id = t.tweet_id AND likes.user_id = $2
                    LEFT JOIN tweet_reposts reposts ON reposts.tweet_id = t.tweet_id AND reposts.user_id = $2
                    LEFT JOIN user_follows follows ON follows.follower_id = $2 AND follows.followed_id = u.id
                `
                        : ''
                }
                WHERE t.user_id = $1 
                    AND (array_length(t.images, 1) > 0 OR array_length(t.videos, 1) > 0)
                ${cursor_condition}
                ORDER BY t.created_at DESC, t.tweet_id DESC
                LIMIT ${limit}
            `;

            // Build params array
            let params: any[];
            if (current_user_id) {
                params = [user_id, current_user_id, ...cursor_params];
            } else {
                params = [user_id, ...cursor_params];
            }

            // Execute query
            const media_tweets = await query_runner.query(query_string, params);

            // Transform to DTOs
            const tweet_dtos = media_tweets.map((tweet: any) => {
                return plainToInstance(
                    TweetResponseDTO,
                    {
                        tweet_id: tweet.tweet_id,
                        user_id: tweet.user_id,
                        type: tweet.type || 'tweet',
                        content: tweet.content,
                        images: tweet.images,
                        videos: tweet.videos,
                        num_likes: tweet.num_likes,
                        num_reposts: tweet.num_reposts,
                        num_views: tweet.num_views,
                        num_quotes: tweet.num_quotes,
                        num_replies: tweet.num_replies,
                        created_at: tweet.created_at,
                        updated_at: tweet.updated_at,
                        current_user_like:
                            current_user_id && tweet.is_liked ? { user_id: current_user_id } : null,
                        current_user_repost:
                            current_user_id && tweet.is_reposted
                                ? { user_id: current_user_id }
                                : null,
                        user: tweet.user,
                    },
                    {
                        excludeExtraneousValues: true,
                    }
                );
            });

            // Generate next cursor
            const next_cursor = this.paginate_service.generateNextCursor(
                media_tweets,
                'created_at',
                'tweet_id'
            );

            return {
                data: tweet_dtos,
                next_cursor,
                has_more: media_tweets.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async getLikedPostsByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        next_cursor: string | null;
        has_more: boolean;
    }> {
        try {
            // Build query for liked posts
            const query = this.tweet_like_repository
                .createQueryBuilder('like')
                .innerJoinAndSelect('like.tweet', 'tweet')
                .leftJoinAndSelect('tweet.user', 'user')
                .where('like.user_id = :user_id', { user_id })
                .orderBy('like.created_at', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .take(limit);

            // Add interaction flags if current_user_id is provided
            if (current_user_id) {
                query
                    .leftJoinAndMapOne(
                        'tweet.current_user_like',
                        TweetLike,
                        'current_user_like',
                        'current_user_like.tweet_id = tweet.tweet_id AND current_user_like.user_id = :current_user_id',
                        { current_user_id }
                    )
                    .leftJoinAndMapOne(
                        'tweet.current_user_repost',
                        TweetRepost,
                        'current_user_repost',
                        'current_user_repost.tweet_id = tweet.tweet_id AND current_user_repost.user_id = :current_user_id',
                        { current_user_id }
                    )
                    .leftJoinAndMapOne(
                        'tweet.current_user_bookmark',
                        TweetBookmark,
                        'current_user_bookmark',
                        'current_user_bookmark.tweet_id = tweet.tweet_id AND current_user_bookmark.user_id = :current_user_id',
                        { current_user_id }
                    )
                    .leftJoinAndMapOne(
                        'user.current_user_follows',
                        UserFollows,
                        'current_user_follows',
                        'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
                        { current_user_id }
                    );
            }

            // Apply cursor pagination using like.created_at for ordering
            this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'like',
                'created_at',
                'tweet_id'
            );

            const liked_posts = await query.getMany();

            // Extract tweets from the likes
            const tweets = liked_posts.map((like) => like.tweet);

            // Transform to DTOs
            const tweet_dtos = tweets.map((tweet) =>
                plainToInstance(TweetResponseDTO, tweet, {
                    excludeExtraneousValues: true,
                })
            );

            // Generate next cursor using liked posts (which have like.created_at)
            const next_cursor =
                liked_posts.length > 0
                    ? this.paginate_service.generateNextCursor(
                          liked_posts.map((lp) => ({
                              created_at: lp.created_at,
                              tweet_id: lp.tweet.tweet_id,
                          })),
                          'created_at',
                          'tweet_id'
                      )
                    : null;

            return {
                data: tweet_dtos,
                next_cursor,
                has_more: liked_posts.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    attachUserTweetInteractionFlags(
        query: SelectQueryBuilder<any>,
        current_user_id?: string,
        alias: string = 'tweet'
    ): SelectQueryBuilder<any> {
        if (current_user_id) {
            query
                .leftJoinAndMapOne(
                    `${alias}.current_user_like`,
                    TweetLike,
                    'current_user_like',
                    `current_user_like.tweet_id = ${alias}.tweet_id AND current_user_like.user_id = :current_user_id`,
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    `${alias}.current_user_repost`,
                    TweetRepost,
                    'current_user_repost',
                    `current_user_repost.tweet_id = ${alias}.tweet_id AND current_user_repost.user_id = :current_user_id`,
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    `${alias}.current_user_bookmark`,
                    TweetBookmark,
                    'current_user_bookmark',
                    `current_user_bookmark.tweet_id = ${alias}.tweet_id AND current_user_bookmark.user_id = :current_user_id`,
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    'user.current_user_follows',
                    UserFollows,
                    'current_user_follows',
                    'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
                    { current_user_id }
                );
        }
        return query;
    }

    /**************************** Alyaa ****************************/

    /**
     * Fetches a reply tweet along with its entire parent chain using a single recursive query.
     * This method efficiently retrieves all parent tweets in the conversation thread
     * without making multiple database calls.
     *
     * @param tweet_id - The ID of the reply tweet to start from
     * @param current_user_id - Optional user ID to check interaction flags (likes, reposts, follows)
     * @returns An array of tweets from the starting reply up to the root parent, ordered from child to parent
     */
    async getReplyWithParentChain(tweet_id: string, current_user_id?: string): Promise<any[]> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();

        try {
            const query_string = getReplyWithParentChainQuery(current_user_id);

            const params = current_user_id ? [tweet_id, current_user_id] : [tweet_id];
            const results = await query_runner.query(query_string, params);

            return results;
        } catch (error) {
            console.error('Error fetching reply chain:', error);
            throw error;
        } finally {
            await query_runner.release();
        }
    }
}
