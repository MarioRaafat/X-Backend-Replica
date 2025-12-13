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
import { TweetCategory } from './entities/tweet-category.entity';
import { tweet_fields_slect } from './queries/tweet-fields-select.query';
import {
    getPostsByUserIdAlyaaQuery,
    getPostsByUserIdAlyaaQueryWithoutView,
} from './queries/get-posts-profile-view.query';

@Injectable()
export class TweetsRepository extends Repository<Tweet> {
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
    ) {
        super(Tweet, data_source.createEntityManager());
    }

    private async incrementTweetViewsAsync(tweet_ids: string[]): Promise<void> {
        if (!tweet_ids.length) return;

        try {
            // Call PostgreSQL function to increment views in batch
            await this.data_source.query('SELECT increment_tweet_views_batch($1::uuid[])', [
                tweet_ids,
            ]);
        } catch (error) {
            // Log error but don't fail the request
            console.error('Failed to increment tweet views:', error);
        }
    }

    async getTweetsByIds(
        tweet_ids: string[],
        current_user_id?: string
    ): Promise<TweetResponseDTO[]> {
        if (!tweet_ids.length) return [];

        let query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .where('tweet.tweet_id IN (:...tweet_ids)', { tweet_ids })
            .select(tweet_fields_slect);

        // Map interaction flags
        query = this.attachUserTweetInteractionFlags(query, current_user_id, 'tweet');

        const tweets = await query.getMany();

        // Increment views asynchronously (don't await)
        this.incrementTweetViewsAsync(tweet_ids).catch(() => {});

        console.log(tweets);

        return plainToInstance(TweetResponseDTO, tweets, {
            excludeExtraneousValues: true,
        });
    }

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
            const cte_query = this.user_posts_view_repository
                .createQueryBuilder('tweet')
                .select(['tweet.*', 'tweet.repost_id AS group_id'])
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
                    'tweet.tweet_author_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = :user_id)',
                    { user_id }
                )
                .andWhere(
                    'tweet.profile_user_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = :user_id)',
                    { user_id }
                );

            let query = this.user_posts_view_repository.manager
                .createQueryBuilder()
                .addCommonTableExpression(cte_query.getQuery(), 'filtered_tweets')
                .addCommonTableExpression(
                    `SELECT *, 
            ROW_NUMBER() OVER (
                PARTITION BY tweet_id
                ORDER BY 
                    CASE WHEN repost_id IS NOT NULL THEN 0 ELSE 1 END,
                    post_date DESC, 
                    id DESC
            ) AS repost_rn
         FROM filtered_tweets`,
                    'deduped_reposts'
                )
                // STEP 2: Deduplicate conversations - keep latest tweet per conversation
                .addCommonTableExpression(
                    `SELECT *, 
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(conversation_id, tweet_id)
                ORDER BY post_date DESC, id DESC
            ) AS conversation_rn
         FROM deduped_reposts
         WHERE repost_rn = 1`,
                    'ranked'
                )
                .select([
                    'ranked.id AS id',

                    'ranked.tweet_id AS tweet_id',
                    'ranked.repost_id AS repost_id',

                    'ranked.profile_user_id AS profile_user_id',
                    'ranked.tweet_author_id AS tweet_author_id',
                    'ranked.repost_id AS repost_id',
                    'ranked.post_type AS post_type',
                    'ranked.type AS type',
                    'ranked.content AS content',
                    'ranked.post_date AS post_date',
                    'ranked.images AS images',
                    'ranked.videos AS videos',
                    'ranked.num_likes AS num_likes',
                    'ranked.num_bookmarks AS num_bookmarks',
                    'ranked.mentions AS mentions',
                    'ranked.num_reposts AS num_reposts',
                    'ranked.num_views AS num_views',
                    'ranked.num_quotes AS num_quotes',
                    'ranked.num_replies AS num_replies',
                    'ranked.created_at AS created_at',
                    'ranked.updated_at AS updated_at',
                    'ranked.reposted_by_name AS reposted_by_name',
                    'ranked.parent_id AS parent_id',
                    'ranked.conversation_id AS conversation_id',
                    'ranked.group_id AS group_id',

                    `json_build_object(
                    'id', ranked.tweet_author_id,
                    'username', ranked.username,
                    'name', ranked.name,
                    'avatar_url', ranked.avatar_url,
                    'cover_url', ranked.cover_url,
                    'verified', ranked.verified,
                    'bio', ranked.bio,
                    'followers', ranked.followers,
                    'following', ranked.following
                ) AS user`,
                ])
                .from('ranked', 'ranked')
                .where('ranked.conversation_rn = 1')
                .setParameters(cte_query.getParameters())
                .setParameter('user_id', user_id)
                .orderBy('ranked.post_date', 'DESC')
                .addOrderBy('ranked.tweet_id', 'DESC')
                .limit(limit);
            query = this.attachUserInteractionBooleanFlags(
                query,
                user_id,
                'ranked.tweet_author_id',
                'ranked.tweet_id'
            );

            query = this.attachRepostInfo(query, 'ranked');
            query = this.attachParentTweetQuery(query, user_id);
            query = this.attachConversationTweetQuery(query, user_id);

            // Apply cursor pagination
            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'ranked',
                'post_date',
                'id'
            );

            let tweets = await query.getRawMany();

            // Increment views for fetched tweets
            const tweet_ids = tweets.map((t) => t.tweet_id).filter(Boolean);
            this.incrementTweetViewsAsync(tweet_ids).catch(() => {});

            tweets = this.attachUserFollowFlags(tweets);

            const tweet_dtos = tweets.map((tweet) =>
                plainToInstance(TweetResponseDTO, tweet, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(tweets, 'post_date', 'id');

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

    /**************************** User Tabs ****************************/
    async getPostsByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        try {
            let query = this.user_posts_view_repository.createQueryBuilder('tweet');

            query = getPostsByUserIdAlyaaQuery(query, user_id);

            query = query
                .andWhere('tweet.type != :type', { type: 'reply' })
                .orderBy('tweet.post_date', 'DESC')
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
                'post_date',
                'tweet_id'
            );

            let tweets = await query.getRawMany();

            // Increment views for fetched posts
            const tweet_ids = tweets.map((t) => t.tweet_id).filter(Boolean);
            this.incrementTweetViewsAsync(tweet_ids).catch(() => {});

            tweets = this.attachUserFollowFlags(tweets);

            const tweet_dtos = tweets.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'post_date',
                'tweet_id'
            );

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
        }
    }

    async getRepliesByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        try {
            let query = this.user_posts_view_repository.createQueryBuilder('tweet');

            query = getPostsByUserIdAlyaaQuery(query, user_id);

            query = query
                .andWhere('tweet.type = :type', { type: 'reply' })
                .orderBy('tweet.post_date', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .limit(limit);

            query = this.attachUserInteractionBooleanFlags(
                query,
                current_user_id,
                'tweet.tweet_author_id',
                'tweet.tweet_id'
            );

            query = this.attachRepliedTweetQuery(query, current_user_id);

            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'tweet',
                'post_date',
                'tweet_id'
            );

            let tweets = await query.getRawMany();

            // Increment views for fetched replies
            const tweet_ids = tweets.map((t) => t.tweet_id).filter(Boolean);
            this.incrementTweetViewsAsync(tweet_ids).catch(() => {});

            tweets = this.attachUserFollowFlags(tweets);

            const tweet_dtos = tweets.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'post_date',
                'tweet_id'
            );

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
        }
    }

    async getMediaByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        try {
            let query = this.user_posts_view_repository.createQueryBuilder('tweet');

            query = getPostsByUserIdAlyaaQuery(query, user_id);

            query = query
                .andWhere(
                    '(array_length(tweet.images, 1) > 0 OR array_length(tweet.videos, 1) > 0)'
                )
                .andWhere('tweet.type != :type', { type: 'repost' })
                .orderBy('tweet.post_date', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .limit(limit);

            query = this.attachUserInteractionBooleanFlags(
                query,
                current_user_id,
                'tweet.tweet_author_id',
                'tweet.tweet_id'
            );

            query = this.attachRepliedTweetQuery(query, current_user_id);

            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'tweet',
                'post_date',
                'tweet_id'
            );

            let tweets = await query.getRawMany();

            // Increment views for fetched media
            const tweet_ids = tweets.map((t) => t.tweet_id).filter(Boolean);
            this.incrementTweetViewsAsync(tweet_ids).catch(() => {});

            tweets = this.attachUserFollowFlags(tweets);

            const tweet_dtos = tweets.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'post_date',
                'tweet_id'
            );

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
        }
    }

    async getLikedPostsByUserId(
        user_id: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        try {
            let query = this.user_posts_view_repository
                .createQueryBuilder('tweet')
                .innerJoin(
                    'tweet_likes',
                    'like',
                    'like.tweet_id = tweet.tweet_id AND like.user_id = :user_id',
                    { user_id }
                );

            query = getPostsByUserIdAlyaaQueryWithoutView(query, user_id);

            query = query
                .where('tweet.type != :type', { type: 'repost' })
                .orderBy('like.created_at', 'DESC')
                .addOrderBy('tweet.tweet_id', 'DESC')
                .limit(limit);

            query = this.attachQuotedTweetQuery(query);

            query = this.attachUserInteractionBooleanFlags(
                query,
                user_id,
                'tweet.tweet_author_id',
                'tweet.tweet_id'
            );

            query = this.attachRepliedTweetQuery(query, user_id);

            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'like',
                'created_at',
                'tweet_id'
            );

            let tweets = await query.getRawMany();

            // Increment views for liked posts
            const tweet_ids = tweets.map((t) => t.tweet_id).filter(Boolean);
            this.incrementTweetViewsAsync(tweet_ids).catch(() => {});

            tweets = this.attachUserFollowFlags(tweets);

            const tweet_dtos = tweets.map((reply) =>
                plainToInstance(TweetResponseDTO, reply, {
                    excludeExtraneousValues: true,
                })
            );

            const next_cursor = this.paginate_service.generateNextCursor(
                tweets,
                'liked_at',
                'tweet_id'
            );

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
        }
    }

    /**************************** Attaches ****************************/

    attachQuotedTweetQuery(query: SelectQueryBuilder<any>): SelectQueryBuilder<any> {
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
                'num_bookmarks', quoted_tweet.num_bookmarks,
                'mentions', quoted_tweet.mentions,
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

    attachRepostInfo(
        query: SelectQueryBuilder<any>,
        table_alias: string = 'tweet'
    ): SelectQueryBuilder<any> {
        query.addSelect(`CASE WHEN ${table_alias}.repost_id IS NOT NULL THEN
       json_build_object(
            'repost_id', ${table_alias}.repost_id,
            'id', ${table_alias}.profile_user_id,
            'name', ${table_alias}.reposted_by_name,
            'reposted_at', ${table_alias}.post_date
        ) ELSE NULL END AS reposted_by`);
        return query;
    }

    attachRepliedTweetQuery(
        query: SelectQueryBuilder<UserPostsView>,
        user_id?: string
    ): SelectQueryBuilder<any> {
        const get_interactions = (alias: string) => {
            if (!user_id) return '';

            return `
        'is_liked', EXISTS(
            SELECT 1 FROM tweet_likes 
            WHERE tweet_likes.tweet_id = ${alias}.tweet_id 
            AND tweet_likes.user_id = :current_user_id
        ),
        'is_reposted', EXISTS(
            SELECT 1 FROM tweet_reposts 
            WHERE tweet_reposts.tweet_id = ${alias}.tweet_id 
            AND tweet_reposts.user_id = :current_user_id
        ),
        'is_following', EXISTS(
            SELECT 1 FROM user_follows 
            WHERE user_follows.follower_id = :current_user_id 
            AND user_follows.followed_id = ${alias}.tweet_author_id
        ),
        'is_follower', EXISTS(
            SELECT 1 FROM user_follows 
            WHERE user_follows.follower_id = ${alias}.tweet_author_id
            AND user_follows.followed_id = :current_user_id
        ),`;
        };

        const parent_sub_query = this.data_source
            .createQueryBuilder()
            .select(
                `
      json_build_object(
        'tweet_id',      p.tweet_id,
        'content',       p.content,
        'created_at',    p.post_date,
        'type',          p.type,
        'images',        p.images,
        'videos',        p.videos,
        'num_likes',     p.num_likes,
        'num_reposts',   p.num_reposts,
        'num_views',     p.num_views,
        'num_replies',   p.num_replies,
        'num_quotes',    p.num_quotes,
        ${get_interactions('p')}
        'user', json_build_object(
          'id',         p.tweet_author_id,
          'username',   p.username,
          'name',       p.name,
          'avatar_url', p.avatar_url,
          'verified',   p.verified,
          'bio',        p.bio,
          'cover_url',  p.cover_url,
          'followers',  p.followers,
          'following',  p.following
        )
      )
    `
            )
            .from('tweet_replies', 'tr')
            .leftJoin('user_posts_view', 'p', 'p.tweet_id = tr.original_tweet_id')
            .where('tr.reply_tweet_id = tweet.tweet_id')
            .limit(1);

        const conversation_sub_query = this.data_source
            .createQueryBuilder()
            .select(
                `
      json_build_object(
        'tweet_id',      c.tweet_id,
        'content',       c.content,
        'created_at',    c.post_date,
        'type',          c.type,
        'images',        c.images,
        'videos',        c.videos,
        'num_likes',     c.num_likes,
        'num_reposts',   c.num_reposts,
        'num_views',     c.num_views,
        'num_replies',   c.num_replies,
        'num_quotes',    c.num_quotes,
        ${get_interactions('c')}
        'user', json_build_object(
          'id',         c.tweet_author_id,
          'username',   c.username,
          'name',       c.name,
          'avatar_url', c.avatar_url,
          'verified',   c.verified,
          'bio',        c.bio,
          'cover_url',  c.cover_url,
          'followers',  c.followers,
          'following',  c.following
        )
      )
    `
            )
            .from('tweet_replies', 'tr2')
            .leftJoin('user_posts_view', 'c', 'c.tweet_id = tr2.conversation_id')
            .where('tr2.reply_tweet_id = tweet.tweet_id')
            .limit(1);

        query
            .addSelect(`(${parent_sub_query.getQuery()})`, 'parent_tweet')
            .addSelect(`(${conversation_sub_query.getQuery()})`, 'conversation_tweet');

        if (user_id) {
            query.setParameter('current_user_id', user_id);
        }

        return query;
    }

    attachParentTweetQuery(
        query: SelectQueryBuilder<any>,
        user_id?: string
    ): SelectQueryBuilder<any> {
        const get_interactions = (alias: string) => {
            if (!user_id) return '';

            return `
        'is_liked', EXISTS(
            SELECT 1 FROM tweet_likes 
            WHERE tweet_likes.tweet_id = ${alias}.tweet_id 
            AND tweet_likes.user_id = :current_user_id
        ),
        'is_reposted', EXISTS(
            SELECT 1 FROM tweet_reposts 
            WHERE tweet_reposts.tweet_id = ${alias}.tweet_id 
            AND tweet_reposts.user_id = :current_user_id
        ),
        'is_following', EXISTS(
            SELECT 1 FROM user_follows 
            WHERE user_follows.follower_id = :current_user_id 
            AND user_follows.followed_id = ${alias}.tweet_author_id
        ),
        'is_follower', EXISTS(
            SELECT 1 FROM user_follows 
            WHERE user_follows.follower_id = ${alias}.tweet_author_id
            AND user_follows.followed_id = :current_user_id
        ),`;
        };

        query.addSelect(
            `
        CASE 
            -- For replies: get parent from tweet_replies
            WHEN ranked.type = 'reply' or (ranked.type='repost' and ranked.post_type='reply')THEN (
                SELECT json_build_object(
                    'tweet_id',      p.tweet_id,
                    'content',       p.content,
                    'created_at',    p.post_date,
                    'type',          p.type,
                    'images',        p.images,
                    'videos',        p.videos,
                    'num_likes',     p.num_likes,
                    'num_reposts',   p.num_reposts,
                    'num_views',     p.num_views,
                    'num_replies',   p.num_replies,
                    'num_quotes',    p.num_quotes,
                    'num_bookmarks', p.num_bookmarks,
                    'mentions',      p.mentions,
                    ${get_interactions('p')}
                      -- Add nested quoted_tweet if conversation root is a quote
            'parent_tweet', CASE 
                WHEN p.type = 'quote' THEN (
                    SELECT json_build_object(
                        'tweet_id',      pc.tweet_id,
                        'content',       pc.content,
                        'created_at',    pc.post_date,
                        'type',          pc.type,
                        'images',        pc.images,
                        'videos',        pc.videos,
                        'num_likes',     pc.num_likes,
                        'num_reposts',   pc.num_reposts,
                        'num_views',     pc.num_views,
                        'num_replies',   pc.num_replies,
                        'num_quotes',    pc.num_quotes,
                        'num_bookmarks', pc.num_bookmarks,
                        'mentions',      pc.mentions,
                        ${get_interactions('pc')}
                        'user', json_build_object(
                            'id',         pc.tweet_author_id,
                            'username',   pc.username,
                            'name',       pc.name,
                            'avatar_url', pc.avatar_url,
                            'verified',   pc.verified,
                            'bio',        pc.bio,
                            'cover_url',  pc.cover_url,
                            'followers',  pc.followers,
                            'following',  pc.following
                        )
                    )
                    FROM user_posts_view pc
                    WHERE p.parent_id = pc.tweet_id
                    LIMIT 1
                )
                ELSE NULL
            END,
                    'user', json_build_object(
                        'id',         p.tweet_author_id,
                        'username',   p.username,
                        'name',       p.name,
                        'avatar_url', p.avatar_url,
                        'verified',   p.verified,
                        'bio',        p.bio,
                        'cover_url',  p.cover_url,
                        'followers',  p.followers,
                        'following',  p.following
                    )
                )
                FROM user_posts_view p
                WHERE ranked.parent_id = p.tweet_id
                LIMIT 1
            )
            
            -- For quotes: get parent from tweet_quotes
            WHEN ranked.type = 'quote' or (ranked.type='repost' and ranked.post_type='quote' )THEN (
                SELECT json_build_object(
                    'tweet_id',      q.tweet_id,
                    'content',       q.content,
                    'created_at',    q.post_date,
                    'type',          q.type,
                    'images',        q.images,
                    'videos',        q.videos,
                    'num_likes',     q.num_likes,
                    'num_reposts',   q.num_reposts,
                    'num_views',     q.num_views,
                    'num_replies',   q.num_replies,
                    'num_quotes',    q.num_quotes,
                    'num_bookmarks', q.num_bookmarks,
                    'mentions',      q.mentions,
                    'user', json_build_object(
                        'id',         q.tweet_author_id,
                        'username',   q.username,
                        'name',       q.name,
                        'avatar_url', q.avatar_url,
                        'verified',   q.verified,
                        'bio',        q.bio,
                        'cover_url',  q.cover_url,
                        'followers',  q.followers,
                        'following',  q.following
                    )
                )
                FROM user_posts_view q 
                WHERE ranked.parent_id = q.tweet_id
                LIMIT 1
            )
            
            ELSE NULL
        END AS parent_tweet
        `
        );

        if (user_id) {
            query.setParameter('current_user_id', user_id);
        }

        return query;
    }

    attachConversationTweetQuery(
        query: SelectQueryBuilder<any>,
        user_id?: string
    ): SelectQueryBuilder<any> {
        const get_interactions = (alias: string) => {
            if (!user_id) return '';

            return `
        'is_liked', EXISTS(
            SELECT 1 FROM tweet_likes 
            WHERE tweet_likes.tweet_id = ${alias}.tweet_id 
            AND tweet_likes.user_id = :current_user_id
        ),
        'is_reposted', EXISTS(
            SELECT 1 FROM tweet_reposts 
            WHERE tweet_reposts.tweet_id = ${alias}.tweet_id 
            AND tweet_reposts.user_id = :current_user_id
        ),
        'is_following', EXISTS(
            SELECT 1 FROM user_follows 
            WHERE user_follows.follower_id = :current_user_id 
            AND user_follows.followed_id = ${alias}.tweet_author_id
        ),
        'is_follower', EXISTS(
            SELECT 1 FROM user_follows 
            WHERE user_follows.follower_id = ${alias}.tweet_author_id
            AND user_follows.followed_id = :current_user_id
        ),`;
        };

        query.addSelect(
            `
       CASE
            WHEN ranked.conversation_id IS NOT NULL THEN  (
            SELECT json_build_object(
                'tweet_id',      c.tweet_id,
                'content',       c.content,
                'created_at',    c.post_date,
                'type',          c.type,
                'images',        c.images,
                'videos',        c.videos,
                'num_likes',     c.num_likes,
                'num_reposts',   c.num_reposts,
                'num_views',     c.num_views,
                'num_replies',   c.num_replies,
                'num_quotes',    c.num_quotes,
                'num_bookmarks', c.num_bookmarks,
                'mentions',      c.mentions,
                    ${get_interactions('c')}
                      -- Add nested quoted_tweet if conversation root is a quote
            'parent_tweet', CASE 
                WHEN c.type = 'quote' THEN (
                    SELECT json_build_object(
                        'tweet_id',      qc.tweet_id,
                        'content',       qc.content,
                        'created_at',    qc.post_date,
                        'type',          qc.type,
                        'images',        qc.images,
                        'videos',        qc.videos,
                        'num_likes',     qc.num_likes,
                        'num_reposts',   qc.num_reposts,
                        'num_views',     qc.num_views,
                        'num_replies',   qc.num_replies,
                        'num_quotes',    qc.num_quotes,
                        'num_bookmarks', qc.num_bookmarks,
                        'mentions',      qc.mentions,
                        ${get_interactions('qc')}
                        'user', json_build_object(
                            'id',         qc.tweet_author_id,
                            'username',   qc.username,
                            'name',       qc.name,
                            'avatar_url', qc.avatar_url,
                            'verified',   qc.verified,
                            'bio',        qc.bio,
                            'cover_url',  qc.cover_url,
                            'followers',  qc.followers,
                            'following',  qc.following
                        )
                    )
                    FROM user_posts_view qc
                    WHERE c.parent_id = qc.tweet_id
                    LIMIT 1
                )
                ELSE NULL
            END,
                'user', json_build_object(
                    'id',         c.tweet_author_id,
                    'username',   c.username,
                    'name',       c.name,
                    'avatar_url', c.avatar_url,
                    'verified',   c.verified,
                    'bio',        c.bio,
                    'cover_url',  c.cover_url,
                    'followers',  c.followers,
                    'following',  c.following
                )
            )
            FROM user_posts_view c       
            WHERE ranked.conversation_id = c.tweet_id
            LIMIT 1
        )
            ELSE NULL
        END AS conversation_tweet
        `
        );

        if (user_id) {
            query.setParameter('current_user_id', user_id);
        }

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

    //TODO: Attach user likes
    attachUserFollowFlags(tweets: any[]) {
        return tweets.map((t) => {
            if (t.user) {
                t.user = {
                    ...t.user,
                    is_following: t.is_following ?? false,
                    is_follower: t.is_follower ?? false,
                };
            }

            if (t.parent_tweet) {
                if (t.parent_tweet.user) {
                    t.parent_tweet.user = {
                        ...t.parent_tweet.user,
                        is_following: t.parent_tweet.is_following ?? false,
                        is_follower: t.parent_tweet.is_follower ?? false,
                    };
                }
            }
            if (t.conversation_tweet) {
                if (t.conversation_tweet.user) {
                    t.conversation_tweet.user = {
                        ...t.conversation_tweet.user,
                        is_following: t.conversation_tweet.is_following ?? false,
                        is_follower: t.conversation_tweet.is_follower ?? false,
                    };
                }
            }
            return t;
        });
    }
}
