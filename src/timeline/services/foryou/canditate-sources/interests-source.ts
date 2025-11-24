import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
import { Tweet } from 'src/tweets/entities';
import { UserPostsView } from 'src/tweets/entities/user-posts-view.entity';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';

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
                    ) AS user
`,
            ])
            .innerJoin('tweet_categories', 'tc', 'tc.tweet_id = tweet.tweet_id')
            .innerJoin(
                'user_interests',
                'ui',
                'ui.category_id = tc.category_id AND ui.user_id = :user_id',
                { user_id }
            )

            .orderBy('tweet.post_date', 'DESC')
            .limit(limit)
            .setParameter('user_id', user_id);

        query = this.tweet_repository.attachUserInteractionBooleanFlags(
            query,
            user_id,
            'tweet.tweet_author_id',
            'tweet.tweet_id'
        );
        query = this.tweet_repository.attachRepostInfo(query);
        query = this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'tweet',
            'post_date',
            'tweet_id'
        );

        let interset_tweets = await query.getRawMany();
        interset_tweets = this.tweet_repository.attachUserFollowFlags(interset_tweets);

        // apply pagination
        console.log(interset_tweets);
        const tweet_dtos = interset_tweets.map((row) => {
            const dto = plainToInstance(ScoredCandidateDTO, row, {
                excludeExtraneousValues: true,
            });

            return dto;
        });
        const next_cursor = this.paginate_service.generateNextCursor(
            interset_tweets,
            'post_date',
            'tweet_id'
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
