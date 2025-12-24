import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EXPLORE_CONFIG, JOB_NAMES, QUEUE_NAMES } from '../constants/queue.constants';
import { ExploreScoreJobDto, ExploreScoreResultDto } from './explore-job.dto';
import { ExploreJobsService } from './explore-jobs.service';

@Processor(QUEUE_NAMES.EXPLORE)
export class ExploreJobsProcessor {
    private readonly logger = new Logger(ExploreJobsProcessor.name);

    constructor(private readonly exploreJobsService: ExploreJobsService) {}

    // Handle explore score recalculation job
    @Process(JOB_NAMES.EXPLORE.RECALCULATE_SCORES)
    async handleRecalculateExploreScores(
        job: Job<ExploreScoreJobDto>
    ): Promise<ExploreScoreResultDto> {
        const start_time = Date.now();
        const {
            since_hours = EXPLORE_CONFIG.DEFAULT_SINCE_HOURS,
            max_age_hours = EXPLORE_CONFIG.DEFAULT_MAX_AGE_HOURS,
            batch_size = EXPLORE_CONFIG.DEFAULT_BATCH_SIZE,
            force_all = false,
        } = job.data;

        this.logger.log(
            `[Job ${job.id}] Starting explore score recalculation - ` +
                `since: ${since_hours}h, max_age: ${max_age_hours}h, batch: ${batch_size}, force: ${force_all}`
        );

        const result: ExploreScoreResultDto = {
            tweets_processed: 0,
            tweets_updated: 0,
            categories_updated: 0,
            duration_ms: 0,
            errors: [],
        };

        try {
            // STEP 1: Recalculate existing Redis top-N tweets
            this.logger.log(`[Job ${job.id}] Step 1: Recalculating existing top tweets in Redis`);
            await job.progress(5);

            const step1_result = await this.exploreJobsService.recalculateExistingTopTweets();

            this.logger.log(
                `[Job ${job.id}] Step 1 Complete - Categories: ${step1_result.categories_processed}, ` +
                    `Tweets Recalculated: ${step1_result.tweets_recalculated}`
            );

            await job.progress(15);

            // STEP 2: Process recent engagement tweets
            this.logger.log(`[Job ${job.id}] Step 2: Processing recent engagement tweets`);

            const total_tweets = await this.exploreJobsService.countTweetsForRecalculation(
                since_hours,
                max_age_hours,
                force_all
            );

            this.logger.log(`[Job ${job.id}] Found ${total_tweets} recent tweets to process`);

            if (total_tweets === 0) {
                result.duration_ms = Date.now() - start_time;
                result.tweets_updated = step1_result.tweets_recalculated;
                await job.progress(100);
                this.logger.log(
                    `[Job ${job.id}] Completed - Only Step 1 executed (no recent engagement tweets)`
                );
                return result;
            }

            //  process in batches
            let processed_count = 0;
            let page = 0;
            const all_categories_updated = new Set<string>();

            while (processed_count < total_tweets) {
                const skip = page * batch_size;

                // Fetch one page
                const batch = await this.exploreJobsService.fetchTweetsForRecalculation(
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
                    // Calculate scores and prepare for Redis update
                    const tweets_with_categories = batch.map((tweet) => ({
                        tweet_id: tweet.tweet_id,
                        score: this.exploreJobsService.calculateScore(tweet),
                        categories: tweet.categories || [],
                    }));

                    // Track unique categories from this batch
                    for (const tweet of tweets_with_categories) {
                        for (const cat of tweet.categories) {
                            all_categories_updated.add(cat.category_id);
                        }
                    }

                    await this.exploreJobsService.updateRedisCategoryScores(tweets_with_categories);

                    processed_count += batch.length;
                    result.tweets_processed += batch.length;
                    result.tweets_updated += batch.length;

                    // update job progress (Step 1: 0-15%, Step 2: 15-100%)
                    const progress = Math.floor(15 + (processed_count / total_tweets) * 85);
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

            // Add Step 1 tweets to total updated count
            result.tweets_updated += step1_result.tweets_recalculated;

            // Set final unique categories count
            result.categories_updated = all_categories_updated.size;

            result.duration_ms = Date.now() - start_time;

            await job.progress(100);

            this.logger.log(
                `[Job ${job.id}] Completed - ` +
                    `Step 1: ${step1_result.tweets_recalculated} tweets, ` +
                    `Step 2: ${result.tweets_processed} tweets, ` +
                    `Total Updated: ${result.tweets_updated}, ` +
                    `Categories: ${result.categories_updated}, ` +
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
