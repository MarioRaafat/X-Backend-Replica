import { Brackets, DataSource, Repository } from 'typeorm';
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
import { User, UserFollows } from 'src/user/entities';
import { getReplyWithParentChainQuery } from './queries/reply-parent-chain.query';
import { getPostsByUserIdQuery } from './queries/get-posts-by-userId.query';
import { SelectQueryBuilder } from 'typeorm/browser';
import { UserPostsView } from './entities/user-posts-view.entity';
import { getFollowingTweetsQuery } from './queries/get-following-tweets.query';
import { getForyouTweetsQuery } from './queries/get-foryou-tweets.query';
import { TweetCategory } from './entities/tweet-category.entity';

@Injectable()
export class TweetsRepository {
    constructor(
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetLike)
        private readonly tweet_like_repository: Repository<TweetLike>,
        @InjectRepository(TweetRepost)
        private readonly tweet_repost_repository: Repository<TweetRepost>,

        @InjectRepository(TweetCategory)
        private readonly tweet_category_repository: Repository<TweetCategory>,
        private readonly paginate_service: PaginationService,
        private data_source: DataSource,
        @InjectRepository(UserPostsView)
        private user_posts_view_repository: Repository<UserPostsView>
    ) {}
    // Tweets
    // Replies
    // Quotes
    // Reposts
    async getFollowingTweets(
        user_id: string,
        cursor?: string,
        limit: number = 20,
        since_hours_ago?: number
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: { next_cursor: string | null; has_more: boolean };
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
                .where(
                    new Brackets((qb) =>
                        qb
                            .where(
                                'tweet.profile_user_id IN (SELECT followed_id FROM user_follows WHERE follower_id = :user_id)',
                                { user_id }
                            )
                            .orWhere('tweet.profile_user_id = :user_id', { user_id })
                    )
                )
                .andWhere(
                    'tweet.profile_user_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = :user_id)',
                    { user_id }
                )

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

            query = this.attachRepostInfo(query);
            query = this.attachRepliedTweetQuery(query);
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
            // generate next cursor
            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'created_at',
                'tweet_id'
            );
            // return data + pagination

            return {
                data: tweet_dtos,
                pagination: {
                    next_cursor,
                    has_more: tweet_dtos.length === limit,
                },
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    async getForyouTweets(
        user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: { next_cursor: string | null; has_more: boolean };
    }> {
        const query_runner = this.data_source.createQueryRunner();

        await query_runner.connect();

        try {
            // extract pagination params

            let cursor_condition = '';
            let cursor_params: any[] = [];

            if (cursor) {
                const [cursor_date_str, cursor_id] = cursor.split('_');
                const cursor_date = new Date(cursor_date_str);
                cursor_condition = `AND (post.post_date < $2 OR (post.post_date = $2 AND post.id < $3))`;
                cursor_params = [cursor_date, cursor_id];
            }
            const query_string = getForyouTweetsQuery(cursor_condition, limit);

            // execute query

            const tweets = await query_runner.query(query_string, [user_id, ...cursor_params]);

            // mapping to tweet response dto

            const tweet_dtos = tweets.map((post: any) => {
                const dto = plainToInstance(
                    TweetResponseDTO,
                    {
                        tweet_id: post.tweet_id,
                        user_id: post.tweet_author_id,
                        type: post.post_type === 'tweet' ? post.type : post.post_type,
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
                        is_liked: post.is_liked,
                        is_reposted: post.is_reposted,
                        // attach is following

                        user: { ...post.user, is_following: post.is_following },
                    },
                    {
                        excludeExtraneousValues: true,
                    }
                );

                // add repost info
                if (post.post_type === 'repost' && post.reposted_by_user) {
                    dto.reposted_by = {
                        repost_id: post.id,
                        id: post.reposted_by_user.id,
                        name: post.reposted_by_user.name,
                        reposted_at: post.post_date,
                    };
                }

                // add quote info
                // add reply info

                return dto;
            });

            // generate next cursor
            const next_cursor = this.paginate_service.generateNextCursor(tweets, 'post_date', 'id');
            // return data + pagination

            return {
                data: tweet_dtos,
                pagination: {
                    next_cursor,
                    has_more: tweets.length === limit,
                },
            };
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            await query_runner.release();
        }
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

    attachQuotedTweetQuery(query: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
        // query
        //     .leftJoin(
        //         'tweet_quotes',
        //         'quote_rel',
        //         `quote_rel.quote_tweet_id = tweet.tweet_id AND tweet.type = 'quote'`
        //     )
        //     .leftJoin(
        //         'user_posts_view',
        //         'quoted_tweet',
        //         'quoted_tweet.tweet_id = quote_rel.original_tweet_id'
        //     )
        //     .addSelect(
        //         `CASE
        //             WHEN tweet.type = 'quote' AND quoted_tweet.tweet_id IS NOT NULL THEN
        //             json_build_object(
        //                 'tweet_id', quoted_tweet.tweet_id,
        //                 'content', quoted_tweet.content,
        //                 'created_at', quoted_tweet.post_date,
        //                 'type', quoted_tweet.type,
        //                 'images', quoted_tweet.images,
        //                 'videos', quoted_tweet.videos,

        //                 'user', json_build_object(
        //                     'id', quoted_tweet.tweet_author_id,
        //                     'username', quoted_tweet.username,
        //                     'name', quoted_tweet.name,
        //                     'avatar_url', quoted_tweet.avatar_url,
        //                     'verified', quoted_tweet.verified,
        //                     'bio', quoted_tweet.bio,
        //                     'cover_url', quoted_tweet.cover_url,
        //                     'followers', quoted_tweet.followers,
        //                     'following', quoted_tweet.following
        //                 )
        //             )
        //             ELSE NULL
        //             END`,
        //         'parent_tweet'
        //     );
        // return query;
        query.addSelect(
            `
        (
            SELECT json_build_object(
                'tweet_id', quoted_tweet.tweet_id,
                'content', quoted_tweet.content,
                'created_at', quoted_tweet.post_date,
                'type', quoted_tweet.type,
                'images', quoted_tweet.images,
                'videos', quoted_tweet.videos,
                'num_likes', quoted_tweet.num_likes,
                'num_reposts', quoted_tweet.num_reposts,
                'num_views', quoted_tweet.num_views,
                'num_replies', quoted_tweet.num_replies,
                'num_quotes', quoted_tweet.num_quotes,
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
            FROM tweet_quotes quote_rel
            JOIN user_posts_view quoted_tweet
                ON quoted_tweet.tweet_id = quote_rel.original_tweet_id
            WHERE quote_rel.quote_tweet_id = tweet.tweet_id
            LIMIT 1
        ) AS parent_tweet
        `
        );

        return query;
    }

    attachRepostInfo(query: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
        query.leftJoin('user', 'u', 'u.id = tweet.profile_user_id')
            .addSelect(`CASE WHEN tweet.type='repost' THEN
           json_build_object(
                        'repost_id', tweet.repost_id,
                        'id',tweet.profile_user_id,
                        'name', u.name,
                        'reposted_at',tweet.post_date
                       
                    ) ELSE NULL
                      END AS reposted_by `);

        return query;
    }

    // get replies
    attachRepliedTweetQuery(query: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
        // Parent tweet (original tweet)
        query.addSelect(`
        (
            SELECT json_build_object(
                'tweet_id', rt.tweet_id,
                'content', rt.content,
                'created_at', rt.post_date,
                'type', rt.type,
                'images', rt.images,
                'videos', rt.videos,
                'num_likes', rt.num_likes,
                'num_reposts', rt.num_reposts,
                'num_views', rt.num_views,
                'num_replies', rt.num_replies,
                'num_quotes', rt.num_quotes,
                'user', json_build_object(
                    'id', rt.tweet_author_id,
                    'username', rt.username,
                    'name', rt.name,
                    'avatar_url', rt.avatar_url,
                    'verified', rt.verified,
                    'bio', rt.bio,
                    'cover_url', rt.cover_url,
                    'followers', rt.followers,
                    'following', rt.following
                )
            )
            FROM tweet_replies tr
            JOIN user_posts_view rt ON rt.tweet_id = tr.original_tweet_id
            WHERE tr.reply_tweet_id = tweet.tweet_id
            LIMIT 1
        ) AS parent_tweet
    `);

        // Conversation root tweet
        query.addSelect(`
        (
            SELECT json_build_object(
                'tweet_id', ct.tweet_id,
                'content', ct.content,
                'created_at', ct.post_date,
                'type', ct.type,
                'images', ct.images,
                'videos', ct.videos,
                'num_likes', ct.num_likes,
                'num_reposts', ct.num_reposts,
                'num_views', ct.num_views,
                'num_replies', ct.num_replies,
                'num_quotes', ct.num_quotes,
                'user', json_build_object(
                    'id', ct.tweet_author_id,
                    'username', ct.username,
                    'name', ct.name,
                    'avatar_url', ct.avatar_url,
                    'verified', ct.verified,
                    'bio', ct.bio,
                    'cover_url', ct.cover_url,
                    'followers', ct.followers,
                    'following', ct.following
                )
            )
            FROM tweet_replies tr2
            JOIN user_posts_view ct ON ct.tweet_id = tr2.conversation_id
            WHERE tr2.reply_tweet_id = tweet.tweet_id
            LIMIT 1
        ) AS conversation_tweet
    `).addSelect(`
       (
    SELECT COALESCE(
        (
            SELECT tr_parent.original_tweet_id <> tr_parent.conversation_id
            FROM tweet_replies tr_child
            JOIN tweet_replies tr_parent
                ON tr_parent.reply_tweet_id = tr_child.original_tweet_id
            WHERE tr_child.reply_tweet_id = tweet.tweet_id
            LIMIT 1
        ),
        FALSE
    )
) AS show_more_replies
        `);

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

    async getRecentTweetsByCategoryIds(
        category_ids: string[],
        user_id: string,
        options: {
            limit?: number;
            since_hours_ago?: number;
        } = {}
    ): Promise<TweetResponseDTO[]> {
        const limit = options.limit ?? 300;
        const since_hours_ago = options.since_hours_ago ?? 48;

        const query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .innerJoin('tweet_category', 'tc', 'tc.tweet_id = tweet.tweet_id')
            .where('tc.category_id = ANY(:category_ids)', { category_ids })
            .andWhere('tweet.created_at > NOW() - INTERVAL :hours hours', {
                hours: since_hours_ago,
            })
            .andWhere('tweet.user_id != :user_id', { user_id })
            //         .andWhere(
            //             `tweet.user_id NOT IN (
            //   SELECT followed_id FROM user_follows WHERE follower_id = :user_id
            // )`
            //         )
            .orderBy('tweet.created_at', 'DESC')
            .addOrderBy('tweet.tweet_id', 'DESC')
            .take(limit + 50); // extra buffer

        // Attach all interaction flags
        const final_query = this.attachUserTweetInteractionFlags(query, user_id, 'tweet');

        const tweets = await final_query.getMany();

        return tweets.map((tweet) =>
            plainToInstance(TweetResponseDTO, tweet, {
                excludeExtraneousValues: true,
            })
        );
    }

    async getTweetsCategories(
        tweet_ids: string[]
    ): Promise<Record<string, { category_id: number; percentage: number }[]>> {
        try {
            const query = this.tweet_category_repository
                .createQueryBuilder('tc')
                .select('tc.tweet_id', 'tweet_id')
                .addSelect('tc.category_id', 'category_id')
                .addSelect('tc.percentage', 'percentage')
                .where('tc.tweet_id IN (:...tweet_ids)', { tweet_ids })
                .orderBy('tc.tweet_id', 'DESC')
                .addOrderBy('tc.percentage', 'DESC');

            const categories = await query.getMany();
            return (
                categories.reduce((acc, entity) => {
                    const tweet_id = entity.tweet_id;

                    if (!acc[tweet_id]) {
                        acc[tweet_id] = [];
                    }

                    acc[tweet_id].push({
                        category_id: entity.category_id,
                        percentage: entity.percentage,
                    });

                    return acc;
                }),
                {} as Record<string, { category_id: number; percentage: number }[]>
            );
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
