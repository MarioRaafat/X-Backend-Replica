import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
    EXPLORE_CONFIG,
    EXPLORE_CRON_SCHEDULE,
    EXPLORE_JOB_PRIORITIES,
} from '../constants/queue.constants';
import { ExploreScoreJobDto } from './explore-job.dto';
import { ExploreJobsService } from './explore-jobs.service';

@Injectable()
export class ExploreJobsCron {
    private readonly logger = new Logger(ExploreJobsCron.name);

    /* istanbul ignore next */
    constructor(private readonly explore_jobs_service: ExploreJobsService) {}

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

            const result = await this.explore_jobs_service.triggerScoreRecalculation(
                job_data,
                EXPLORE_JOB_PRIORITIES.NORMAL
            );

            if (result.success) {
                this.logger.log(`Scheduled explore score update job [${result.job_id}]`);
            } else {
                this.logger.error('Failed to schedule explore score update:', result.error);
            }
        } catch (error) {
            this.logger.error('Failed to schedule explore score update job:', error);
        }
    }
}
