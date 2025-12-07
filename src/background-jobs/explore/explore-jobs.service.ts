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
    JOB_NAMES,
    QUEUE_NAMES,
    EXPLORE_JOB_PRIORITIES,
    EXPLORE_JOB_RETRY,
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

    private getRecalculationQueryBuilder(
        since_hours: number,
        max_age_hours: number,
        force_all: boolean
    ) {
        const maxAgeDate = new Date();
        maxAgeDate.setHours(maxAgeDate.getHours() - max_age_hours);

        const query = this.tweet_repository
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
            .where('tweet.deleted_at IS NULL')
            .andWhere('tweet.created_at > :maxAgeDate', {
                maxAgeDate,
            });

        if (!force_all) {
            const sinceDate = new Date();
            sinceDate.setHours(sinceDate.getHours() - since_hours);

            // Only process tweets with recent engagement activity
            query.andWhere(
                `(
                            tweet.updated_at > :sinceDate
                            OR tweet.created_at > :sinceDate
                        )`,
                { sinceDate }
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
}
