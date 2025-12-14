import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tweet } from '../../tweets/entities/tweet.entity';
import { TweetCategory } from '../../tweets/entities/tweet-category.entity';
import { RedisService } from '../../redis/redis.service';
import {
    EXPLORE_CONFIG,
    EXPLORE_JOB_PRIORITIES,
    EXPLORE_JOB_RETRY,
    JOB_NAMES,
    QUEUE_NAMES,
} from '../constants/queue.constants';
import { ExploreScoreJobDto } from './explore-job.dto';

interface ITweetScoreData {
    tweet_id: string;
    num_likes: number;
    num_reposts: number;
    num_quotes: number;
    num_replies: number;
    created_at: Date;
    categories?: Array<{ category_id: string; percentage: number }>;
}

@Injectable()
export class ExploreJobsService {
    private readonly logger = new Logger(ExploreJobsService.name);
    constructor(
        @InjectQueue(QUEUE_NAMES.EXPLORE) private explore_queue: Queue,
        @InjectRepository(Tweet) private tweet_repository: Repository<Tweet>,
        private redis_service: RedisService
    ) {}

    // ============================================
    // QUEUE OPERATIONS (Job Triggering)
    // ============================================

    async triggerScoreRecalculation(
        job_data: ExploreScoreJobDto,
        priority: number = EXPLORE_JOB_PRIORITIES.NORMAL
    ) {
        try {
            const job = await this.explore_queue.add(
                JOB_NAMES.EXPLORE.RECALCULATE_SCORES,
                job_data,
                {
                    priority,
                    attempts: EXPLORE_JOB_RETRY.attempts,
                    backoff: EXPLORE_JOB_RETRY.backoff,
                }
            );

            this.logger.log(
                `Triggered explore score recalculation [${job.id}] - Priority: ${priority}`
            );

            return {
                success: true,
                job_id: job.id,
                params: job_data,
            };
        } catch (error) {
            this.logger.error('Failed to trigger explore score recalculation:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async getQueueStats() {
        try {
            const waiting = await this.explore_queue.getWaiting();
            const active = await this.explore_queue.getActive();
            const completed = await this.explore_queue.getCompleted();
            const failed = await this.explore_queue.getFailed();

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total_jobs: waiting.length + active.length + completed.length + failed.length,
            };
        } catch (error) {
            this.logger.error('Failed to get queue stats:', error);
            throw error;
        }
    }

    // ============================================
    // DOMAIN LOGIC (Score Calculation & Data)
    // ============================================

    calculateScore(tweet: ITweetScoreData): number {
        const { num_likes, num_reposts, num_quotes, num_replies, created_at } = tweet;

        // Calculate weighted engagement
        const weighted_engagement =
            num_likes * EXPLORE_CONFIG.ENGAGEMENT_WEIGHTS.LIKE +
            num_reposts * EXPLORE_CONFIG.ENGAGEMENT_WEIGHTS.REPOST +
            num_quotes * EXPLORE_CONFIG.ENGAGEMENT_WEIGHTS.QUOTE +
            num_replies * EXPLORE_CONFIG.ENGAGEMENT_WEIGHTS.REPLY;

        // Calculate age in hours
        const now = new Date();
        const age_ms = now.getTime() - new Date(created_at).getTime();
        const age_hours = Math.max(0, age_ms / (1000 * 60 * 60));

        // Apply gravity formula
        const denominator = Math.pow(
            age_hours + EXPLORE_CONFIG.TIME_OFFSET,
            EXPLORE_CONFIG.GRAVITY
        );

        if (denominator === 0) return 0;

        return weighted_engagement / denominator;
    }

    private getBaseTweetQueryBuilder() {
        return this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndMapMany(
                'tweet.categories',
                TweetCategory,
                'tc',
                'tc.tweet_id = tweet.tweet_id'
            )
            .select([
                'tweet.tweet_id',
                'tweet.num_likes',
                'tweet.num_reposts',
                'tweet.num_quotes',
                'tweet.num_replies',
                'tweet.created_at',
                'tweet.updated_at',
                'tc.category_id',
                'tc.percentage',
            ])
            .where('tweet.deleted_at IS NULL');
    }

    private getRecalculationQueryBuilder(
        since_hours: number,
        max_age_hours: number,
        force_all: boolean
    ) {
        const max_age_date = new Date();
        max_age_date.setHours(max_age_date.getHours() - max_age_hours);

        const query = this.getBaseTweetQueryBuilder().andWhere('tweet.created_at > :max_age_date', {
            max_age_date,
        });

        if (!force_all) {
            const since_date = new Date();
            since_date.setHours(since_date.getHours() - since_hours);

            // Only process tweets with recent engagement activity
            query.andWhere(
                `(
                            tweet.updated_at > :since_date
                            OR tweet.created_at > :since_date
                        )`,
                { since_date }
            );
        }

        return query;
    }

    async countTweetsForRecalculation(
        since_hours: number,
        max_age_hours: number,
        force_all: boolean = false
    ): Promise<number> {
        const query = this.getRecalculationQueryBuilder(since_hours, max_age_hours, force_all);
        return query.getCount();
    }

    async fetchTweetsForRecalculation(
        since_hours: number,
        max_age_hours: number,
        force_all: boolean = false,
        skip: number = 0,
        take: number = 500
    ): Promise<ITweetScoreData[]> {
        const query = this.getRecalculationQueryBuilder(since_hours, max_age_hours, force_all);

        // Order by updated_at to prioritize recently active tweets
        query.orderBy('tweet.updated_at', 'DESC');

        query.skip(skip).take(take);

        const tweets = await query.getMany();
        this.logger.log(
            `Fetched ${tweets.length} tweets for recalculation (skip: ${skip}, take: ${take})`
        );
        return tweets as any as ITweetScoreData[];
    }

    // STEP 1: RECALCULATE EXISTING REDIS TOP-N TWEETS

    async getAllActiveCategoryIds(): Promise<string[]> {
        try {
            const pattern = 'explore:category:*';
            const keys = await this.redis_service.keys(pattern);

            const category_ids = keys
                .map((key) => {
                    const match = key.match(/explore:category:(.+)/);
                    return match ? match[1] : null;
                })
                .filter((id) => id !== null);

            this.logger.log(`Found ${category_ids.length} active categories in Redis`);
            return category_ids;
        } catch (error) {
            this.logger.error('Error fetching active category IDs:', error);
            return [];
        }
    }

    async fetchTweetsByIds(tweet_ids: string[]): Promise<ITweetScoreData[]> {
        if (tweet_ids.length === 0) return [];

        try {
            const tweets = await this.getBaseTweetQueryBuilder()
                .andWhere('tweet.tweet_id IN (:...tweet_ids)', { tweet_ids })
                .getMany();

            return tweets as any as ITweetScoreData[];
        } catch (error) {
            this.logger.error('Error fetching tweets by IDs:', error);
            return [];
        }
    }

    //Recalculate scores for existing top-N tweets in Redis

    async recalculateExistingTopTweets(): Promise<{
        categories_processed: number;
        tweets_recalculated: number;
    }> {
        const start_time = Date.now();

        // Get all active category IDs
        const category_ids = await this.getAllActiveCategoryIds();

        if (category_ids.length === 0) {
            this.logger.log('No active categories found in Redis');
            return { categories_processed: 0, tweets_recalculated: 0 };
        }

        // Fetch all category tweets in one Redis pipeline
        const fetch_pipeline = this.redis_service.pipeline();
        for (const category_id of category_ids) {
            const redis_key = `explore:category:${category_id}`;
            fetch_pipeline.zrevrange(
                redis_key,
                0,
                EXPLORE_CONFIG.MAX_CATEGORY_SIZE - 1,
                'WITHSCORES'
            );
        }

        const pipeline_results = await fetch_pipeline.exec();

        // Validate pipeline results
        if (!pipeline_results) {
            this.logger.error('Redis pipeline returned null results');
            return { categories_processed: 0, tweets_recalculated: 0 };
        }

        // Parse results and collect all unique tweet IDs
        const category_tweets_map = new Map<string, Array<{ tweet_id: string; score: number }>>();
        const all_tweet_ids = new Set<string>();

        for (let i = 0; i < category_ids.length; i++) {
            const category_id = category_ids[i];
            const [error, results] = pipeline_results[i];

            if (error || !results || !Array.isArray(results) || results.length === 0) {
                category_tweets_map.set(category_id, []);
                continue;
            }

            const top_tweets: Array<{ tweet_id: string; score: number }> = [];
            for (let j = 0; j < results.length; j += 2) {
                const tweet_id = results[j] as string;
                const score = parseFloat(results[j + 1] as string);
                top_tweets.push({ tweet_id, score });
                all_tweet_ids.add(tweet_id);
            }

            category_tweets_map.set(category_id, top_tweets);
        }

        this.logger.log(
            `Fetched ${all_tweet_ids.size} unique tweets across ${category_ids.length} categories`
        );

        if (all_tweet_ids.size === 0) {
            this.logger.log('No tweets found in any category');
            return { categories_processed: category_ids.length, tweets_recalculated: 0 };
        }

        // Fetch all tweet data in one DB query
        const tweet_data = await this.fetchTweetsByIds(Array.from(all_tweet_ids));
        const tweet_data_map = new Map(tweet_data.map((t) => [t.tweet_id, t]));

        // Recalculate scores and prepare Redis updates
        const update_pipeline = this.redis_service.pipeline();
        let total_tweets_recalculated = 0;

        for (const category_id of category_ids) {
            const top_tweets = category_tweets_map.get(category_id) || [];
            const redis_key = `explore:category:${category_id}`;

            for (const top_tweet of top_tweets) {
                const tweet = tweet_data_map.get(top_tweet.tweet_id);

                if (!tweet) {
                    // Tweet not found (deleted or doesn't exist), remove from Redis
                    update_pipeline.zrem(redis_key, top_tweet.tweet_id);
                    continue;
                }

                // Recalculate score with updated engagement and time decay
                const new_score = this.calculateScore(tweet);

                // Find the percentage for this category
                const category = tweet.categories?.find((c) => c.category_id === category_id);
                const percentage = category?.percentage || 100;
                const weighted_score = new_score * (percentage / 100);

                // Update Redis with new score if above threshold
                if (weighted_score >= EXPLORE_CONFIG.MIN_SCORE_THRESHOLD) {
                    update_pipeline.zadd(redis_key, weighted_score, tweet.tweet_id);
                    total_tweets_recalculated++;
                } else {
                    // Score too low, remove from category
                    update_pipeline.zrem(redis_key, tweet.tweet_id);
                }
            }
        }

        // Execute all Redis updates atomically
        await update_pipeline.exec();

        // Trim all categories to top 50
        await this.trimCategoryZSets(category_ids);

        const duration = Date.now() - start_time;
        this.logger.log(
            `Recalculated existing top tweets: ${category_ids.length} categories, ` +
                `${total_tweets_recalculated} tweets in ${duration}ms`
        );

        return {
            categories_processed: category_ids.length,
            tweets_recalculated: total_tweets_recalculated,
        };
    }

    // PROCESS RECENT ENGAGEMENT TWEETS

    async updateRedisCategoryScores(
        tweets: {
            tweet_id: string;
            score: number;
            categories: { category_id: string; percentage: number }[];
        }[]
    ): Promise<number> {
        if (tweets.length === 0) return 0;

        const pipeline = this.redis_service.pipeline();
        const categories_updated = new Set<string>();

        for (const tweet of tweets) {
            for (const cat of tweet.categories) {
                const weighted_score = tweet.score * (cat.percentage / 100);
                if (weighted_score >= EXPLORE_CONFIG.MIN_SCORE_THRESHOLD) {
                    const redis_key = `explore:category:${cat.category_id}`;
                    pipeline.zadd(redis_key, weighted_score, tweet.tweet_id);
                    categories_updated.add(cat.category_id);
                }
            }
        }

        await pipeline.exec();
        this.logger.log(`Updated scores for ${categories_updated.size} categories`);

        await this.trimCategoryZSets(Array.from(categories_updated));

        return categories_updated.size;
    }

    //Keeps only top N tweets per category

    private async trimCategoryZSets(category_ids: string[]): Promise<void> {
        if (category_ids.length === 0) return;

        this.logger.log(`Trimming ZSets for ${category_ids.length} categories`);
        const pipeline = this.redis_service.pipeline();

        for (const category_id of category_ids) {
            const redis_key = `explore:category:${category_id}`;

            // Keep top MAX_CATEGORY_SIZE tweets
            pipeline.zremrangebyrank(redis_key, 0, -(EXPLORE_CONFIG.MAX_CATEGORY_SIZE + 1));

            // Category automatic expiration
            pipeline.expire(redis_key, 48 * 60 * 60);
        }

        await pipeline.exec();
    }

    async clearScoreRecalculation() {
        this.logger.log('Clearing explore score recalculation');
        await this.redis_service.deleteByPrefix('explore:category:');
    }
}
