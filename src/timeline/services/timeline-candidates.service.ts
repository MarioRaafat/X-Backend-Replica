import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { TweetCategory } from 'src/tweets/entities/tweet-category.entity';
import { Tweet } from 'src/tweets/entities/tweet.entity';

export interface ICandidateTweet {
    tweet_id: string;
    created_at: Date;
    category_id: number;
    score: number;
}

@Injectable()
export class TimelineCandidatesService {
    private readonly tweet_freshness_days: number;
    LIMIT_FACTOR: number;

    constructor(
        @InjectRepository(UserInterests)
        private readonly user_interests_repository: Repository<UserInterests>,
        @InjectRepository(TweetCategory)
        private readonly tweet_category_repository: Repository<TweetCategory>,
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        private readonly config_service: ConfigService
    ) {
        this.tweet_freshness_days = this.config_service.get<number>(
            'TIMELINE_TWEET_FRESHNESS_DAYS',
            7
        );

        this.LIMIT_FACTOR = 500; // Factor to over-fetch for filtering
    }

    /**
     * Get candidate tweets based on user's interests
     * @param user_id User ID
     * @param excluded_tweet_ids Tweet IDs to exclude (already seen)
     * @param limit Maximum number of candidates to return
     * @returns Array of candidate tweets
     */
    async getCandidates(
        user_id: string,
        excluded_tweet_ids: Set<string>,
        limit: number
    ): Promise<ICandidateTweet[]> {
        // console.log(
        //     `[Candidates] Getting ${limit} candidates for user ${user_id}, excluding ${excluded_tweet_ids.size} tweets`
        // );
        const user_interests = await this.user_interests_repository.find({
            where: { user_id },
            order: { score: 'DESC' },
        });
        // console.log(`[Candidates] Found ${user_interests.length} interests for user ${user_id}`);

        if (user_interests.length === 0) {
            console.log(`[Candidates] No interests found, using random fallback`);
            // Fallback: Get random fresh tweets if user has no interests
            return this.getRandomFreshTweets(user_id, excluded_tweet_ids, limit);
        }

        // Get freshness cutoff date
        const cutoff_date = new Date();
        cutoff_date.setDate(cutoff_date.getDate() - this.tweet_freshness_days);

        // Calculate total score and percentage for each interest
        const total_score = user_interests.reduce((sum, interest) => sum + interest.score, 0);
        const candidates: ICandidateTweet[] = [];

        // Get tweets for each interest category based on score percentage
        for (const interest of user_interests) {
            const score_percentage = interest.score / total_score;
            const tweets_for_this_category = Math.ceil(limit * score_percentage);

            const category_tweets = await this.getTweetsForCategory(
                user_id,
                interest.category_id as any,
                cutoff_date,
                excluded_tweet_ids,
                tweets_for_this_category,
                interest.score
            );

            candidates.push(...category_tweets);

            if (candidates.length >= limit) {
                break;
            }
        }

        // If we don't have enough candidates, try fallback
        if (candidates.length < limit) {
            const additional_needed = limit - candidates.length;
            console.log(
                `[Candidates] Only found ${candidates.length}/${limit} tweets, fetching ${additional_needed} from fallback`
            );
            const fallback_tweets = await this.getFallbackTweets(
                user_id,
                excluded_tweet_ids,
                additional_needed,
                new Set(user_interests.map((i) => i.category_id as any))
            );
            console.log(`[Candidates] Fallback provided ${fallback_tweets.length} tweets`);
            candidates.push(...fallback_tweets);
        }

        const final_candidates = candidates.sort((a, b) => b.score - a.score).slice(0, limit);
        return final_candidates;
    }

    private async getTweetsForCategory(
        user_id: string,
        category_id: number,
        cutoff_date: Date,
        excluded_tweet_ids: Set<string>,
        limit: number,
        interest_score: number
    ): Promise<ICandidateTweet[]> {
        const query = this.tweet_category_repository
            .createQueryBuilder('tc')
            .innerJoin('tc.tweet', 'tweet')
            .innerJoin('tweet.user', 'user')
            .where('tc.category_id = :category_id', { category_id })
            // .andWhere('tweet.created_at >= :cutoff_date', { cutoff_date })
            .andWhere('tweet.deleted_at IS NULL')
            .andWhere('user.deleted_at IS NULL')
            // Exclude blocked users
            .andWhere(
                `tweet.user_id NOT IN (
                    SELECT blocked_id FROM user_blocks WHERE blocker_id = :user_id
                )`,
                { user_id }
            )
            // Exclude muted users
            .andWhere(
                `tweet.user_id NOT IN (
                    SELECT muted_id FROM user_mutes WHERE muter_id = :user_id
                )`,
                { user_id }
            )
            // Exclude user's own tweets
            .andWhere('tweet.user_id != :user_id', { user_id })
            .select([
                'tweet.tweet_id AS tweet_id',
                'tweet.created_at AS created_at',
                'tc.category_id AS category_id',
                'tc.percentage AS percentage',
            ])
            .orderBy('tweet.created_at', 'DESC');
        // commented out till we test performance
        // .limit(limit * this.LIMIT_FACTOR); // Get more to filter out seen ones

        const results = await query.getRawMany();

        const candidates: ICandidateTweet[] = [];
        for (const result of results) {
            if (excluded_tweet_ids.has(result.tweet_id)) {
                continue;
            }

            const score = interest_score * (result.percentage / 100);
            candidates.push({
                tweet_id: result.tweet_id,
                created_at: result.created_at,
                category_id: result.category_id,
                score,
            });

            if (candidates.length >= limit) {
                break;
            }
        }

        return candidates;
    }

    private async getFallbackTweets(
        user_id: string,
        excluded_tweet_ids: Set<string>,
        limit: number,
        user_category_ids: Set<number>
    ): Promise<ICandidateTweet[]> {
        const cutoff_date = new Date();
        cutoff_date.setDate(cutoff_date.getDate() - this.tweet_freshness_days);

        const query = this.tweet_repository
            .createQueryBuilder('tweet')
            .innerJoin('tweet.user', 'user')
            .where('tweet.created_at >= :cutoff_date', { cutoff_date })
            .andWhere('tweet.deleted_at IS NULL')
            .andWhere('user.deleted_at IS NULL')
            .andWhere(
                `tweet.user_id NOT IN (
                    SELECT blocked_id FROM user_blocks WHERE blocker_id = :user_id
                )`,
                { user_id }
            )
            .andWhere(
                `tweet.user_id NOT IN (
                    SELECT muted_id FROM user_mutes WHERE muter_id = :user_id
                )`,
                { user_id }
            )
            .andWhere('tweet.user_id != :user_id', { user_id })
            .select([
                'tweet.tweet_id AS tweet_id',
                'tweet.created_at AS created_at',
                'tweet.num_likes AS num_likes',
                'tweet.num_views AS num_views',
            ])
            .orderBy('tweet.num_likes', 'DESC')
            .addOrderBy('tweet.num_views', 'DESC')
            .addOrderBy('tweet.created_at', 'DESC')
            .limit(limit * this.LIMIT_FACTOR);

        const results = await query.getRawMany();

        const candidates: ICandidateTweet[] = [];
        for (const result of results) {
            if (excluded_tweet_ids.has(result.tweet_id)) {
                continue;
            }

            // Score based on engagement
            const score = result.num_likes * 2 + result.num_views * 0.1;

            candidates.push({
                tweet_id: result.tweet_id,
                created_at: result.created_at,
                category_id: 0, // No specific category
                score,
            });

            if (candidates.length >= limit) {
                break;
            }
        }

        return candidates;
    }

    private async getRandomFreshTweets(
        user_id: string,
        excluded_tweet_ids: Set<string>,
        limit: number
    ): Promise<ICandidateTweet[]> {
        const cutoff_date = new Date();
        cutoff_date.setDate(cutoff_date.getDate() - this.tweet_freshness_days);

        const query = this.tweet_repository
            .createQueryBuilder('tweet')
            .innerJoin('tweet.user', 'user')
            .where('tweet.created_at >= :cutoff_date', { cutoff_date })
            .andWhere('tweet.deleted_at IS NULL')
            .andWhere('user.deleted_at IS NULL')
            .andWhere(
                `tweet.user_id NOT IN (
                    SELECT blocked_id FROM user_blocks WHERE blocker_id = :user_id
                )`,
                { user_id }
            )
            .andWhere(
                `tweet.user_id NOT IN (
                    SELECT muted_id FROM user_mutes WHERE muter_id = :user_id
                )`,
                { user_id }
            )
            .andWhere('tweet.user_id != :user_id', { user_id })
            .select([
                'tweet.tweet_id AS tweet_id',
                'tweet.created_at AS created_at',
                'tweet.num_likes AS num_likes',
            ])
            .orderBy('RANDOM()')
            .limit(limit * this.LIMIT_FACTOR);

        const results = await query.getRawMany();

        const candidates: ICandidateTweet[] = [];
        for (const result of results) {
            if (excluded_tweet_ids.has(result.tweet_id)) {
                continue;
            }

            candidates.push({
                tweet_id: result.tweet_id,
                created_at: result.created_at,
                category_id: 0,
                score: result.num_likes || 0,
            });

            if (candidates.length >= limit) {
                break;
            }
        }

        return candidates;
    }
}
