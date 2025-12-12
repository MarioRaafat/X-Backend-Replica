import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
import { Tweet } from 'src/tweets/entities';
import { UserPostsView } from 'src/tweets/entities/user-posts-view.entity';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { Brackets, QueryResult, Repository, SelectQueryBuilder } from 'typeorm';

@Injectable()
export class InterestsCandidateSource {
    constructor(
        private readonly tweet_repository: TweetsRepository,
        @InjectRepository(UserPostsView)
        private user_posts_view_repository: Repository<UserPostsView>,
        private readonly paginate_service: PaginationService
    ) {}

    async getCandidates(
        user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<{
        data: ScoredCandidateDTO[];
        pagination: { next_cursor: string | null; has_more: boolean };
    }> {
        const cte_query = this.user_posts_view_repository
            .createQueryBuilder('tweet')
            .select(['tweet.*', 'tweet.repost_id AS group_id'])
            .where(
                'tweet.tweet_author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = :user_id)',
                { user_id }
            )
            .andWhere(
                'tweet.profile_user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = :user_id)',
                { user_id }
            )
            .andWhere(
                'tweet.tweet_author_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = :user_id)',
                { user_id }
            )
            .andWhere(
                'tweet.profile_user_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = :user_id)',
                { user_id }
            )
            .andWhere('tweet.type != :reply_type', { reply_type: 'reply' });

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
            .where('ranked.repost_rn = 1')
            .andWhere(
                `EXISTS (
        SELECT 1 
        FROM tweet_categories tc 
        INNER JOIN user_interests ui ON ui.category_id = tc.category_id 
        WHERE tc.tweet_id = ranked.tweet_id 
        AND ui.user_id = :user_id
    )`
            )
            .setParameters(cte_query.getParameters())
            .setParameter('user_id', user_id)
            .orderBy('ranked.post_date', 'DESC')
            .addOrderBy('ranked.tweet_id', 'DESC')
            .limit(limit);

        query = this.tweet_repository.attachUserInteractionBooleanFlags(
            query,
            user_id,
            'ranked.tweet_author_id',
            'ranked.tweet_id'
        );

        query = this.tweet_repository.attachRepostInfo(query, 'ranked');
        query = this.tweet_repository.attachParentTweetQuery(query, user_id);

        // Apply cursor pagination
        query = this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'ranked',
            'post_date',
            'id'
        );

        let interset_tweets = await query.getRawMany();
        // console.log(interset_tweets);

        if (interset_tweets.length === 0) {
            console.log('no interest tweets, fetching random tweets');
            query = this.user_posts_view_repository.manager
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
                .where('ranked.repost_rn = 1')
                .setParameters(cte_query.getParameters())
                .setParameter('user_id', user_id)
                .orderBy('RANDOM()')
                .addOrderBy('ranked.post_date', 'DESC')
                .addOrderBy('ranked.tweet_id', 'DESC')
                .limit(limit);

            query = this.tweet_repository.attachUserInteractionBooleanFlags(
                query,
                user_id,
                'ranked.tweet_author_id',
                'ranked.tweet_id'
            );

            query = this.tweet_repository.attachRepostInfo(query, 'ranked');
            query = this.tweet_repository.attachParentTweetQuery(query, user_id);

            // Apply cursor pagination
            query = this.paginate_service.applyCursorPagination(
                query,
                cursor,
                'ranked',
                'post_date',
                'id'
            );

            interset_tweets = await query.getRawMany();
        }
        interset_tweets = this.tweet_repository.attachUserFollowFlags(interset_tweets);

        // apply pagination
        console.log(interset_tweets.length);
        const tweet_dtos = interset_tweets.map((row) => {
            const dto = plainToInstance(ScoredCandidateDTO, row, {
                excludeExtraneousValues: true,
            });

            return dto;
        });
        const next_cursor = this.paginate_service.generateNextCursor(
            interset_tweets,
            'post_date',
            'id'
        );

        return {
            data: tweet_dtos,
            pagination: {
                next_cursor,
                has_more: tweet_dtos.length === limit,
            },
        };
    }
}
