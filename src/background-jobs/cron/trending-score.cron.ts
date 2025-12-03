import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
    TRENDING_CONFIG,
    TRENDING_CRON_SCHEDULE,
    JOB_NAMES,
    TRENDING_JOB_PRIORITIES,
    TRENDING_JOB_RETRY,
    QUEUE_NAMES,
} from '../constants/queue.constants';
import { TrendingScoreJobDto } from '../dto/trending-job.dto';

@Injectable()
export class TrendingScoreCron {
    private readonly logger = new Logger(TrendingScoreCron.name);

    constructor(
        @InjectQueue(QUEUE_NAMES.TRENDING)
        private readonly trending_queue: Queue
    ) {}

    // Schedule trending score update job every hour
    @Cron(TRENDING_CRON_SCHEDULE, {
        name: 'recalculate-trending-scores',
        timeZone: 'UTC',
    })
    async scheduleTrendingScoreUpdate() {
        try {
            const job_data: TrendingScoreJobDto = {
                since_hours: TRENDING_CONFIG.DEFAULT_SINCE_HOURS,
                max_age_hours: TRENDING_CONFIG.DEFAULT_MAX_AGE_HOURS,
                batch_size: TRENDING_CONFIG.DEFAULT_BATCH_SIZE,
                force_all: false,
            };

            const job = await this.trending_queue.add(
                JOB_NAMES.TRENDING.RECALCULATE_SCORES,
                job_data,
                {
                    priority: TRENDING_JOB_PRIORITIES.NORMAL,
                    attempts: TRENDING_JOB_RETRY.attempts,
                    backoff: TRENDING_JOB_RETRY.backoff,
                }
            );

            this.logger.log(
                `Scheduled trending score update job [${job.id}] - `
            );
        } catch (error) {
            this.logger.error('Failed to schedule trending score update job:', error);
        }
    }

    // Manual trigger for trending score update
    async triggerManualUpdate() {
        try {
            const job_data: TrendingScoreJobDto = {
                since_hours: TRENDING_CONFIG.DEFAULT_SINCE_HOURS,
                max_age_hours: TRENDING_CONFIG.DEFAULT_MAX_AGE_HOURS,
                batch_size: TRENDING_CONFIG.DEFAULT_BATCH_SIZE,
                force_all: false,
            };

            const job = await this.trending_queue.add(
                JOB_NAMES.TRENDING.RECALCULATE_SCORES,
                job_data,
                {
                    priority: TRENDING_JOB_PRIORITIES.HIGH, // Higher priority for manual triggers
                    attempts: TRENDING_JOB_RETRY.attempts,
                    backoff: TRENDING_JOB_RETRY.backoff,
                }
            );

            this.logger.log(`Manual trending score update triggered [${job.id}]`);

            return {
                success: true,
                job_id: job.id,
                params: job_data,
            };
        } catch (error) {
            this.logger.error('Failed to trigger manual trending update:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    // current queue stats
    async getQueueStats() {
        try {
            const waiting = await this.trending_queue.getWaiting();
            const active = await this.trending_queue.getActive();
            const completed = await this.trending_queue.getCompleted();
            const failed = await this.trending_queue.getFailed();

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
}
