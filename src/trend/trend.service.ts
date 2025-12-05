import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { IHashtagScore } from './hashtag-score.interface';
import { Cron } from '@nestjs/schedule';
import { Hashtag } from 'src/tweets/entities/hashtags.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VelocityExponentialDetector } from './velocity-exponential-detector';
import { HashtagResponseDto } from './dto/hashtag-response.dto';
import { HashtagJobDto } from 'src/background-jobs/hashtag/hashtag-job.dto';

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

    private readonly TOP_N = 30;
    private readonly MIN_BUCKETS = 5 * 60 * 1000;
    private readonly CATEGORY_THRESHOLD = 30;

    async getTrending(category?: string) {
        const key = category ? `trending:${category}` : 'trending:global';

        const trending = await this.redis_service.zrevrange(key, 0, this.TOP_N - 1, 'WITHSCORES');

        const result: any[] = [];
        const hashtag_names: string[] = [];

        for (let i = 0; i < trending.length; i += 2) {
            result.push({
                hashtag: trending[i],
                score: parseFloat(trending[i + 1]),
            });
            hashtag_names.push(trending[i]);
        }

        const hashtags = await this.hashtag_repository.find({
            where: { name: In(hashtag_names) },
            select: ['name', 'usage_count'],
        });
        const trends: HashtagResponseDto[] = result.map((item, index) => {
            const hashtag_data = hashtags.find((h) => h.name === item.hashtag);

            return {
                hashtags: item.hashtag,
                posts_count: hashtag_data ? hashtag_data.usage_count : 0,
                rank: index + 1,
            };
        });

        return { data: trends };
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////Helper Functions////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    // One call per tweet
    async insertCandidateHashtags(hashtags: HashtagJobDto) {
        const hashtag_names = Object.keys(hashtags.hashtags);
        const args = hashtag_names.flatMap((hashtag) => [hashtags.timestamp, hashtag]);
        await this.redis_service.zadd('candidates:active', ...args);

        //Expire after 2 hours
        // We may delegate it to trend worker
        await this.redis_service.expire('candidates:active', 2 * 60 * 60);
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
                    pipeline.expire(`candidates:${category_name}`, 2 * 60 * 60);
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

    @Cron('0 * * * *')
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

            const scored_hashtags: IHashtagScore[] = [];

            for (const hashtag of active_hashtags) {
                const score_data = await this.calculateHashtagScore(hashtag);
                if (score_data !== null) {
                    scored_hashtags.push(score_data);
                }
            }

            // 3. Sort by score (descending)
            scored_hashtags.sort((a, b) => b.score - a.score);

            // 4. Take top 30
            const top_30 = scored_hashtags.slice(0, this.TOP_N);

            // 5. Update Trending List

            await this.updateTrendingList('trending:global', top_30);
            console.log(top_30);
        } catch (err) {
            console.log(err);
            throw err;
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
            console.log(acceleration_score);

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
                // last_seen: last_seen,
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
