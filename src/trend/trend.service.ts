import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { IHashtagScore } from './hashtag-score.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Hashtag } from 'src/tweets/entities/hashtags.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VelocityExponentialDetector } from './velocity-exponential-detector';
import { HashtagResponseDto } from './dto/hashtag-response.dto';
import { HashtagJobDto } from 'src/background-jobs/hashtag/hashtag-job.dto';
import { TREND_CRON_SCHEDULE } from 'src/background-jobs';

@Injectable()
export class TrendService {
    constructor(
        private readonly redis_service: RedisService,
        private readonly velocity_calculator: VelocityExponentialDetector,
        @InjectRepository(Hashtag)
        private readonly hashtag_repository: Repository<Hashtag>
    ) {}

    private readonly WEIGHTS = {
        VOLUME: 0.35,
        ACCELERATION: 0.4,
        RECENCY: 0.25,
    };

    private readonly CATEGORIES = ['Sports', 'News', 'Entertainment'];
    private readonly GENERAL_CATEGORY = 'Only on Yapper';

    private readonly TOP_N = 30;
    private readonly MIN_BUCKETS = 5 * 60 * 1000;
    private readonly CATEGORY_THRESHOLD = 30;

    async getTrending(category?: string, limit: number = 30) {
        const key = category ? `trending:${category}` : 'trending:global';

        const trending = await this.redis_service.zrevrange(key, 0, limit - 1, 'WITHSCORES');

        const result: any[] = [];
        const hashtag_names: string[] = [];

        for (let i = 0; i < trending.length; i += 2) {
            result.push({
                hashtag: trending[i],
                score: parseFloat(trending[i + 1]),
            });
            hashtag_names.push(trending[i]);
        }

        const normalized_hashtags = hashtag_names.map((hashtag) => {
            return hashtag.toLowerCase();
        });

        const hashtags = await this.hashtag_repository.find({
            where: { name: In(normalized_hashtags) },
            select: ['name', 'usage_count'],
        });

        const hashtag_categories = await this.getHashtagCategories(hashtag_names);

        const trends: HashtagResponseDto[] = result.map((item, index) => {
            const hashtag_data = hashtags.find((h) => h.name === item.hashtag.toLowerCase());

            return {
                text: '#' + item.hashtag,
                posts_count: hashtag_data ? hashtag_data.usage_count : 0,
                trend_rank: index + 1,
                category: hashtag_categories[item.hashtag] || this.GENERAL_CATEGORY,
                reference_id: item.hashtag.toLowerCase(),
            };
        });

        return { data: trends };
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////Helper Functions////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    async getHashtagCategories(hashtag_names: string[]): Promise<Record<string, string>> {
        const pipeline = this.redis_service.pipeline();

        for (const hashtag of hashtag_names) {
            for (const category of this.CATEGORIES) {
                pipeline.zscore(`candidates:${category}`, hashtag);
            }
        }
        const results = await pipeline.exec();

        const hashtag_categories: Record<string, string> = {};

        if (!results) {
            // Return default categories if pipeline fails
            return hashtag_names.reduce(
                (acc, hashtag) => {
                    acc[hashtag] = this.GENERAL_CATEGORY;
                    return acc;
                },
                {} as Record<string, string>
            );
        }
        let result_index = 0;
        for (const hashtag of hashtag_names) {
            let max_score = -1;
            let max_category = this.GENERAL_CATEGORY;

            for (const category of this.CATEGORIES) {
                const result = results[result_index];
                // Check if result exists and has valid data
                if (result && result[1] !== null && result[1] !== undefined) {
                    const score = parseFloat(result[1] as string);
                    if (score > max_score) {
                        max_score = score;
                        max_category = category;
                    }
                }
                result_index++;
            }

            hashtag_categories[hashtag] = max_category;
        }

        return hashtag_categories;
    }
    // One call per tweet
    async insertCandidateHashtags(hashtags: HashtagJobDto) {
        const hashtag_names = Object.keys(hashtags.hashtags);
        const args = hashtag_names.flatMap((hashtag) => [hashtags.timestamp, hashtag]);
        await this.redis_service.zadd('candidates:active', ...args);

        //Expire after 2 hours
        // We may delegate it to trend worker
        await this.redis_service.expire('candidates:active', 1 * 60 * 60);
    }
    async insertCandidateCategories(hashtags: HashtagJobDto) {
        const pipeline = this.redis_service.pipeline();
        const hashtag_names = Object.keys(hashtags.hashtags);

        for (const hashtag of hashtag_names) {
            const categories = hashtags.hashtags[hashtag];

            for (const [category_name, percent] of Object.entries(categories)) {
                // Only add to category if percentage meets threshold
                if (percent >= this.CATEGORY_THRESHOLD) {
                    // Store hashtag with its category percentage as score
                    pipeline.zadd(`candidates:${category_name}`, percent, hashtag);
                    pipeline.expire(`candidates:${category_name}`, 1 * 60 * 60);
                }
            }
        }

        await pipeline.exec();
    }

    async updateHashtagCounts(hashtags: HashtagJobDto) {
        const pipeline = this.redis_service.pipeline();
        const hashtag_names = Object.keys(hashtags.hashtags);

        for (const hashtag of hashtag_names) {
            //Every 5 mins mapped to same member
            const time_bucket =
                Math.floor(hashtags.timestamp / this.MIN_BUCKETS) * this.MIN_BUCKETS;

            //Update hashtag

            await this.redis_service.zincrby(`hashtag:${hashtag}`, 1, time_bucket.toString());

            await this.redis_service.expire(`hashtag:${hashtag}`, 1 * 60 * 60);
        }

        await pipeline.exec();
    }

    @Cron(CronExpression.EVERY_HOUR, {
        name: 'trend_calculation_job',
        timeZone: 'UTC',
    })
    async calculateTrend() {
        try {
            console.log('Calculate Trend.....');
            const now = Date.now();
            const one_hour_ago = now - 60 * 60 * 1000;

            // 1. Get active candidates (last hour)
            const active_hashtags = await this.redis_service.zrangebyscore(
                'candidates:active',
                one_hour_ago,
                '+inf'
            );
            // 2. Calculate base scores once for all hashtags
            const hashtag_scores: Map<string, IHashtagScore> = new Map();

            for (const hashtag of active_hashtags) {
                const score_data = await this.calculateHashtagScore(hashtag);
                if (score_data !== null) {
                    hashtag_scores.set(hashtag, score_data);
                }
            }

            // 3. Calculate global trending
            const global_scored = Array.from(hashtag_scores.values());
            global_scored.sort((a, b) => b.score - a.score);
            const global_top_30 = global_scored.slice(0, this.TOP_N);
            await this.updateTrendingList('trending:global', global_top_30);
            await this.calculateCategoryTrendsFromScores(hashtag_scores, one_hour_ago);
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    private async calculateCategoryTrendsFromScores(
        hashtag_scores: Map<string, IHashtagScore>,
        one_hour_ago: number
    ) {
        for (const category of this.CATEGORIES) {
            try {
                // Get category candidates with percentages
                const category_candidates = await this.redis_service.zrevrange(
                    `candidates:${category}`,
                    0,
                    -1,
                    'WITHSCORES'
                );

                if (!category_candidates || category_candidates.length === 0) {
                    continue;
                }

                const scored_hashtags: IHashtagScore[] = [];

                for (let i = 0; i < category_candidates.length; i += 2) {
                    const hashtag = category_candidates[i];
                    const category_percent = parseFloat(category_candidates[i + 1]);

                    // Use pre-calculated score
                    const base_score_data = hashtag_scores.get(hashtag);

                    if (base_score_data) {
                        const category_boost = category_percent / 100;
                        const final_score = base_score_data.score * (1 + category_boost);

                        scored_hashtags.push({
                            ...base_score_data,
                            score: final_score,
                        });
                    }
                }

                scored_hashtags.sort((a, b) => b.score - a.score);
                const top_30 = scored_hashtags.slice(0, this.TOP_N);
                await this.updateTrendingList(`trending:${category}`, top_30);
            } catch (err) {
                console.log(`Error calculating ${category} trend:`, err);
            }
        }
    }

    async calculateHashtagScore(hashtag: string): Promise<IHashtagScore | null> {
        try {
            const buckets_5m = await this.redis_service.zrevrange(
                `hashtag:${hashtag}`,
                0,
                -1,
                'WITHSCORES'
            );

            if (!buckets_5m || buckets_5m.length === 0) {
                return null;
            }
            const bucket_data: Array<{ timestamp: number; count: number }> = [];
            for (let i = 0; i < buckets_5m.length; i += 2) {
                bucket_data.push({
                    timestamp: parseInt(buckets_5m[i]),
                    count: parseFloat(buckets_5m[i + 1]),
                });
            }

            // Calculate individual scores
            const volume_score = this.calculateTweetVolume(bucket_data);
            // const acceleration_score = this.calculateAccelerationScore(bucket_data);
            const acceleration_score = this.velocity_calculator.calculateFinalMomentum(bucket_data);

            const last_seen = await this.redis_service.zscore('candidates:active', hashtag);
            const last_seen_time = last_seen ? parseInt(last_seen) : null;
            const recency_score = this.calculateRecencyScore(last_seen_time);

            const final_score = this.calculateFinalScore(
                volume_score,
                acceleration_score,
                recency_score
            );

            return {
                hashtag,
                score: final_score,
                volume: volume_score,
                acceleration: acceleration_score,
                recency: recency_score,
            };
        } catch (err) {
            return null;
        }
    }

    async updateTrendingList(key: string, hashtags: Array<{ hashtag: string; score: number }>) {
        if (!hashtags.length) return;
        const pipeline = this.redis_service.pipeline();

        // Delete old list
        pipeline.del(key);

        // Add new top hashtags
        hashtags.forEach(({ hashtag, score }) => {
            pipeline.zadd(key, score, hashtag);
        });

        await pipeline.exec();
    }

    private calculateTweetVolume(buckets: Array<{ timestamp: number; count: number }>) {
        const total_volume = buckets.reduce((sum, b) => sum + b.count, 0);

        if (total_volume === 0) return 0;

        //  Logarithmic scale: 1 tweet = 0, 10 = 20, 100 = 40, 1000 = 60, 10000 = 80
        const log_score = Math.log10(total_volume + 1) * 20;

        return Math.min(100, log_score);
    }

    private calculateAccelerationScore(buckets: Array<{ timestamp: number; count: number }>) {
        if (buckets.length < 2) return 0;

        const first_bucket = buckets[buckets.length - 1].count;

        const current_bucket = buckets[0].count;

        //Multiplying by factor may be applied

        const acceleration = current_bucket - first_bucket;
        if (acceleration <= 0) return 0; // Declining or flat

        // Normalize: 10 more tweets = 20 score, 50 more = 100 score
        const normalized = (acceleration / 50) * 100;

        return Math.min(100, normalized);
    }

    private calculateRecencyScore(last_seen: number | null): number {
        if (!last_seen) return 0;

        const minutes_ago = (Date.now() - last_seen) / (60 * 1000);

        if (minutes_ago <= 1) return 100;

        const score = 100 - (minutes_ago / 60) * 100;

        return Math.max(0, score);
    }

    private calculateFinalScore(volume: number, acceleration: number, recency: number): number {
        const weighted_score =
            volume * this.WEIGHTS.VOLUME +
            acceleration * this.WEIGHTS.ACCELERATION +
            recency * this.WEIGHTS.RECENCY;

        return weighted_score;
    }
}
