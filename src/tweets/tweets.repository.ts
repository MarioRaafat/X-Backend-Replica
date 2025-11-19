import { DataSource, Repository } from 'typeorm';
import { Tweet, TweetLike, TweetReply, TweetRepost } from './entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { TimelineResponseDto } from 'src/timeline/dto/timeline-response.dto';
import { TimelinePaginationDto } from 'src/timeline/dto/timeline-pagination.dto';
import { TweetResponseDTO } from './dto';
import { TweetType } from 'src/shared/enums/tweet-types.enum';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { plainToInstance } from 'class-transformer';
import { User, UserFollows } from 'src/user/entities';
import { getReplyWithParentChainQuery } from './queries/reply-parent-chain.query';
import { getPostsByUserIdQuery } from './queries/get-posts-by-userId.query';
import { SelectQueryBuilder } from 'typeorm/browser';
import { UserPostsView } from './entities/user-posts-view.entity';

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
        private data_source: DataSource,
        @InjectRepository(UserPostsView)
        private user_posts_view_repository: Repository<UserPostsView>
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
            .limit(pagination.limit)
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
        const tweets = this.mapRawTweetsToDTOs(raw_results);

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
                SELECT 1 FROM user_follows             
                WHERE follower_id = :user_id
                AND followed_id = tweet.user_id)`,
                'is_following'
            )
            .orderBy('RANDOM()')
            .limit(pagination.limit)
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
        const tweets = this.mapRawTweetsToDTOs(raw_results);

        const next_cursor =
            tweets.length > 0 && tweets.length === pagination.limit
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
                is_liked: row.is_liked === true,
                is_reposted: row.is_reposted === true,
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
                is_liked: row.is_liked === true,
                is_reposted: row.is_reposted === true,
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
        pagination: TimelinePaginationDto
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
            .where('reply.original_tweet_id = :tweet_id')
            .andWhere(
                `tweet.user_id NOT IN(
                SELECT muted_id 
                FROM user_mutes
                WHERE muter_id = :user_id
            )`
            )
            .orderBy('tweet.created_at', 'DESC')
            .limit(pagination.limit)
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
        const tweets = this.mapRawTweetsToRepliesDTOs(raw_results);

        const next_cursor =
            tweets.length > 0 && tweets.length === pagination.limit
                ? `${tweets[tweets.length - 1].created_at.toISOString()}_${tweets[tweets.length - 1].tweet_id}`
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
        try {
            let query = this.user_posts_view_repository
                .createQueryBuilder('tweet')
                .select([
                    'tweet.tweet_id AS tweet_id',
                    'tweet.profile_user_id AS profile_user_id',
                    'tweet.tweet_author_id AS tweet_author_id',
                    'tweet.repost_id AS repost_id',
                    'tweet.post_type AS post_type',
                    'tweet.type AS type',
                    'tweet.content AS content',
                    'tweet.type AS type',
                    'tweet.post_date AS post_date',
                    'tweet.images AS images',
                    'tweet.videos AS videos',
                    'tweet.num_likes AS num_likes',
                    'tweet.num_reposts AS num_reposts',
                    'tweet.num_views AS num_views',
                    'tweet.num_quotes AS num_quotes',
                    'tweet.num_replies AS num_replies',
                    'tweet.created_at AS created_at',
                    'tweet.updated_at AS updated_at',
                    `json_build_object(
                        'id', tweet.tweet_author_id,
                        'username', tweet.username,
                        'name', tweet.name,
                        'avatar_url', tweet.avatar_url,
                        'cover_url', tweet.cover_url,
                        'verified', tweet.verified,
                        'bio', tweet.bio,
                        'followers', tweet.followers,
                        'following', tweet.following
                    ) AS user`,
                ])
                .where('tweet.profile_user_id = :user_id', { user_id })
                .andWhere('tweet.type != :type', { type: 'reply' })
                .orderBy('tweet.created_at', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .limit(limit);

            query = this.attachQuotedTweetQuery(query);

            query = this.attachUserInteractionBooleanFlags(
                query,
                current_user_id,
                'tweet.tweet_author_id',
                'tweet.tweet_id'
            );

            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'tweet',
                'created_at',
                'tweet_id'
            );

            const tweets = await query.getRawMany();

            const tweet_dtos = tweets.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'created_at',
                'tweet_id'
            );

            return {
                data: tweet_dtos,
                next_cursor,
                has_more: tweets.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
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
        try {
            let query = this.user_posts_view_repository
                .createQueryBuilder('tweet')
                .select([
                    'tweet.tweet_id AS tweet_id',
                    'tweet.profile_user_id AS profile_user_id',
                    'tweet.tweet_author_id AS tweet_author_id',
                    'tweet.repost_id AS repost_id',
                    'tweet.post_type AS post_type',
                    'tweet.type AS type',
                    'tweet.content AS content',
                    'tweet.type AS type',
                    'tweet.post_date AS post_date',
                    'tweet.images AS images',
                    'tweet.videos AS videos',
                    'tweet.num_likes AS num_likes',
                    'tweet.num_reposts AS num_reposts',
                    'tweet.num_views AS num_views',
                    'tweet.num_quotes AS num_quotes',
                    'tweet.num_replies AS num_replies',
                    'tweet.created_at AS created_at',
                    'tweet.updated_at AS updated_at',
                    `json_build_object(
                        'id', tweet.tweet_author_id,
                        'username', tweet.username,
                        'name', tweet.name,
                        'avatar_url', tweet.avatar_url,
                        'cover_url', tweet.cover_url,
                        'verified', tweet.verified,
                        'bio', tweet.bio,
                        'followers', tweet.followers,
                        'following', tweet.following
                    ) AS user`,
                ])
                .where('tweet.profile_user_id = :user_id', { user_id })
                .andWhere(
                    '(array_length(tweet.images, 1) > 0 OR array_length(tweet.videos, 1) > 0)'
                )
                .orderBy('tweet.created_at', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .limit(limit);

            query = this.attachUserInteractionBooleanFlags(
                query,
                current_user_id,
                'tweet.tweet_author_id',
                'tweet.tweet_id'
            );

            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'tweet',
                'created_at',
                'tweet_id'
            );

            const tweets = await query.getRawMany();

            const tweet_dtos = tweets.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'created_at',
                'tweet_id'
            );

            return {
                data: tweet_dtos,
                next_cursor,
                has_more: tweets.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getLikedPostsByUserId(
        user_id: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        next_cursor: string | null;
        has_more: boolean;
    }> {
        try {
            let query = this.user_posts_view_repository
                .createQueryBuilder('tweet')
                .innerJoin(
                    'tweet_likes',
                    'like',
                    'like.tweet_id = tweet.tweet_id AND like.user_id = :user_id',
                    { user_id }
                )
                .select([
                    'tweet.tweet_id AS tweet_id',
                    'tweet.profile_user_id AS profile_user_id',
                    'tweet.tweet_author_id AS tweet_author_id',
                    'tweet.repost_id AS repost_id',
                    'tweet.post_type AS post_type',
                    'tweet.type AS type',
                    'tweet.content AS content',
                    'tweet.type AS type',
                    'tweet.post_date AS post_date',
                    'tweet.images AS images',
                    'tweet.videos AS videos',
                    'tweet.num_likes AS num_likes',
                    'tweet.num_reposts AS num_reposts',
                    'tweet.num_views AS num_views',
                    'tweet.num_quotes AS num_quotes',
                    'tweet.num_replies AS num_replies',
                    'tweet.created_at AS created_at',
                    'tweet.updated_at AS updated_at',
                    `json_build_object(
                        'id', tweet.tweet_author_id,
                        'username', tweet.username,
                        'name', tweet.name,
                        'avatar_url', tweet.avatar_url,
                        'cover_url', tweet.cover_url,
                        'verified', tweet.verified,
                        'bio', tweet.bio,
                        'followers', tweet.followers,
                        'following', tweet.following
                    ) AS user`,
                ])
                .where('tweet.type != :type', { type: 'repost' })
                .orderBy('tweet.created_at', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .limit(limit);

            query = this.attachQuotedTweetQuery(query);

            query = this.attachUserInteractionBooleanFlags(
                query,
                user_id,
                'tweet.tweet_author_id',
                'tweet.tweet_id'
            );

            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'tweet',
                'created_at',
                'tweet_id'
            );

            const tweets = await query.getRawMany();

            const tweet_dtos = tweets.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'created_at',
                'tweet_id'
            );

            return {
                data: tweet_dtos,
                next_cursor,
                has_more: tweets.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    attachQuotedTweetQuery(query: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
        query.addSelect(
            `(SELECT 
            CASE
                WHEN tweet.type = 'quote' OR (tweet.type = 'repost' AND tweet.post_type = 'quote') THEN
                json_build_object(
                    'tweet_id', quoted_tweet.tweet_id,
                    'content', quoted_tweet.content,
                    'created_at', quoted_tweet.post_date,
                    'type', quoted_tweet.type,
                    'images', quoted_tweet.images,
                    'videos', quoted_tweet.videos,
                    'user', json_build_object(
                        'id', quoted_tweet.tweet_author_id,
                        'username', quoted_tweet.username,
                        'name', quoted_tweet.name,
                        'avatar_url', quoted_tweet.avatar_url,
                        'verified', quoted_tweet.verified,
                        'bio', quoted_tweet.bio,
                        'cover_url', quoted_tweet.cover_url,
                        'followers', quoted_tweet.followers,
                        'following', quoted_tweet.following
                    )
                )
                ELSE NULL
            END
         FROM tweet_quotes quote_rel
         LEFT JOIN user_posts_view quoted_tweet ON quoted_tweet.tweet_id = quote_rel.original_tweet_id
         WHERE quote_rel.quote_tweet_id = tweet.tweet_id
         LIMIT 1
        )`,
            'parent_tweet'
        );
        return query;
    }

    attachUserInteractionBooleanFlags(
        query: SelectQueryBuilder<any>,
        current_user_id?: string,
        user_id_column: string = 'tweet.tweet_author_id',
        tweet_id_column: string = 'tweet.tweet_id'
    ): SelectQueryBuilder<any> {
        if (current_user_id) {
            query
                .addSelect(
                    `EXISTS(
                    SELECT 1 FROM tweet_likes 
                    WHERE tweet_likes.tweet_id = ${tweet_id_column} 
                    AND tweet_likes.user_id = :current_user_id
                )`,
                    'is_liked'
                )
                .addSelect(
                    `EXISTS(
                    SELECT 1 FROM tweet_reposts 
                    WHERE tweet_reposts.tweet_id = ${tweet_id_column} 
                    AND tweet_reposts.user_id = :current_user_id
                )`,
                    'is_reposted'
                )
                .addSelect(
                    `EXISTS(
                    SELECT 1 FROM user_follows 
                    WHERE user_follows.follower_id = :current_user_id 
                    AND user_follows.followed_id = ${user_id_column}
                )`,
                    'is_following'
                )
                .addSelect(
                    `EXISTS(
                    SELECT 1 FROM user_follows 
                    WHERE user_follows.follower_id = ${user_id_column}
                    AND user_follows.followed_id = :current_user_id
                )`,
                    'is_follower'
                )
                .setParameter('current_user_id', current_user_id);
        }
        return query;
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
