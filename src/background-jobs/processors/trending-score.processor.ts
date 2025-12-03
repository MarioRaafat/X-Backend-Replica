import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import {
    TRENDING_CONFIG,
    JOB_NAMES,
    QUEUE_NAMES,
} from '../constants/queue.constants';
import { TrendingScoreJobDto, TrendingScoreResultDto } from '../dto/trending-job.dto';
import { TrendingScoreService } from '../services/trending-score.service';

@Processor(QUEUE_NAMES.TRENDING)
export class TrendingScoreProcessor {
    private readonly logger = new Logger(TrendingScoreProcessor.name);

    constructor(private readonly trending_score_service: TrendingScoreService) {}

    // Handle trending score recalculation job
    @Process(JOB_NAMES.TRENDING.RECALCULATE_SCORES)
    async handleRecalculateTrendingScores(
        job: Job<TrendingScoreJobDto>
    ): Promise<TrendingScoreResultDto> {
        const start_time = Date.now();
        const {
            since_hours = TRENDING_CONFIG.DEFAULT_SINCE_HOURS,
            max_age_hours = TRENDING_CONFIG.DEFAULT_MAX_AGE_HOURS,
            batch_size = TRENDING_CONFIG.DEFAULT_BATCH_SIZE,
            force_all = false,
        } = job.data;

        this.logger.log(
            `[Job ${job.id}] Starting trending score recalculation - ` +
                `since: ${since_hours}h, max_age: ${max_age_hours}h, batch: ${batch_size}, force: ${force_all}`
        );

        const result: TrendingScoreResultDto = {
            tweets_processed: 0,
            tweets_updated: 0,
            categories_updated: 0,
            duration_ms: 0,
            errors: [],
        };

        try {
            //count total tweets to process
            await job.progress(5);
            const total_tweets = await this.trending_score_service.countTweetsForRecalculation(
                since_hours,
                max_age_hours,
                force_all
            );

            this.logger.log(`[Job ${job.id}] Found ${total_tweets} tweets to process`);

            if (total_tweets === 0) {
                result.duration_ms = Date.now() - start_time;
                await job.progress(100);
                return result;
            }

            //  process in batches
            let processed_count = 0;
            let page = 0;

            while (processed_count < total_tweets) {
                const skip = page * batch_size;
                
                // Fetch one page
                const batch = await this.trending_score_service.fetchTweetsForRecalculation(
                    since_hours,
                    max_age_hours,
                    force_all,
                    skip,
                    batch_size
                );

                if (batch.length === 0) {
                    break; 
                }

                try {
                    // calculate scores for batch
                    const tweet_scores = batch.map((tweet) => ({
                        tweet_id: tweet.tweet_id,
                        score: this.trending_score_service.calculateScore(tweet),
                    }));

                    // update Redis with new scores
                    const tweets_with_categories = batch.map((tweet, index) => ({
                        tweet_id: tweet.tweet_id,
                        score: tweet_scores[index].score,
                        categories: tweet.categories || [],
                    }));

                    const categories_updated =
                        await this.trending_score_service.updateRedisCategoryScores(
                            tweets_with_categories
                        );
                    result.categories_updated = Math.max(
                        result.categories_updated,
                        categories_updated
                    );

                    processed_count += batch.length;
                    result.tweets_processed += batch.length;
                    result.tweets_updated += batch.length;

                    // update job progress (debugging purpose)
                    const progress = Math.floor(10 + (processed_count / total_tweets) * 85);
                    await job.progress(progress);

                    this.logger.debug(
                        `[Job ${job.id}] Processed page ${page + 1} - ${batch.length} tweets (Total: ${processed_count}/${total_tweets})`
                    );
                } catch (error) {
                    const error_msg = `Page ${page + 1} failed: ${error.message}`;
                    this.logger.error(`[Job ${job.id}] ${error_msg}`, error.stack);
                    result.errors.push(error_msg);
                }
                
                page++;
            }

            result.duration_ms = Date.now() - start_time;

            await job.progress(100);

            this.logger.log(
                `[Job ${job.id}] Completed - Processed: ${result.tweets_processed}, ` +
                    `Categories Updated (Max): ${result.categories_updated}, ` +
                    `Duration: ${result.duration_ms}ms`
            );

            return result;
        } catch (error) {
            this.logger.error(`[Job ${job.id}] error:`, error.stack);
            result.errors = result.errors || [];
            result.errors.push(`Fatal: ${error.message}`);
            result.duration_ms = Date.now() - start_time;
            throw error; 
        }
    }
}
