import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
    EXPLORE_CONFIG,
    EXPLORE_CRON_SCHEDULE,
    JOB_NAMES,
    EXPLORE_JOB_PRIORITIES,
    EXPLORE_JOB_RETRY,
    QUEUE_NAMES,
} from '../constants/queue.constants';
import { ExploreScoreJobDto } from './explore-job.dto';

@Injectable()
export class ExploreJobsCron {
    private readonly logger = new Logger(ExploreJobsCron.name);

    constructor(
        @InjectQueue(QUEUE_NAMES.EXPLORE)
        private readonly explore_queue: Queue
    ) {}

    // Schedule explore score update job every hour
    @Cron(EXPLORE_CRON_SCHEDULE, {
        name: 'recalculate-explore-scores',
        timeZone: 'UTC',
    })
    async scheduleExploreScoreUpdate() {
        try {
            const job_data: ExploreScoreJobDto = {
                since_hours: EXPLORE_CONFIG.DEFAULT_SINCE_HOURS,
                max_age_hours: EXPLORE_CONFIG.DEFAULT_MAX_AGE_HOURS,
                batch_size: EXPLORE_CONFIG.DEFAULT_BATCH_SIZE,
                force_all: false,
            };

            const job = await this.explore_queue.add(
                JOB_NAMES.EXPLORE.RECALCULATE_SCORES,
                job_data,
                {
                    priority: EXPLORE_JOB_PRIORITIES.NORMAL,
                    attempts: EXPLORE_JOB_RETRY.attempts,
                    backoff: EXPLORE_JOB_RETRY.backoff,
                }
            );

            this.logger.log(`Scheduled explore score update job [${job.id}] - `);
        } catch (error) {
            this.logger.error('Failed to schedule explore score update job:', error);
        }
    }

    // Manual trigger for explore score update
    async triggerManualUpdate() {
        try {
            const job_data: ExploreScoreJobDto = {
                since_hours: EXPLORE_CONFIG.DEFAULT_SINCE_HOURS,
                max_age_hours: EXPLORE_CONFIG.DEFAULT_MAX_AGE_HOURS,
                batch_size: EXPLORE_CONFIG.DEFAULT_BATCH_SIZE,
                force_all: false,
            };

            const job = await this.explore_queue.add(
                JOB_NAMES.EXPLORE.RECALCULATE_SCORES,
                job_data,
                {
                    priority: EXPLORE_JOB_PRIORITIES.HIGH, // Higher priority for manual triggers
                    attempts: EXPLORE_JOB_RETRY.attempts,
                    backoff: EXPLORE_JOB_RETRY.backoff,
                }
            );

            this.logger.log(`Manual explore score update triggered [${job.id}]`);

            return {
                success: true,
                job_id: job.id,
                params: job_data,
            };
        } catch (error) {
            this.logger.error('Failed to trigger manual explore update:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    // current queue stats
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
}
