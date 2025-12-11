import { InjectQueue } from '@nestjs/bull';
import { BackgroundJobsService } from '../background-jobs';
import { QUEUE_NAMES } from '../constants/queue.constants';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bull';
import { JOB_NAMES, JOB_PRIORITIES, JOB_DELAYS } from '../constants/queue.constants';
import { GenerateTweetSummaryDto } from './ai-summary.dto';

@Injectable()
export class AiSummaryJobService extends BackgroundJobsService<GenerateTweetSummaryDto> {
    constructor(
        @InjectQueue(QUEUE_NAMES.AI_SUMMARY)
        protected readonly queue: Queue
    ) {
        super(
            queue,
            JOB_NAMES.AI_SUMMARY.GENERATE_TWEET_SUMMARY,
            JOB_PRIORITIES.MEDIUM,
            JOB_DELAYS.IMMEDIATE
        );
    }

    protected getJobId(dto: GenerateTweetSummaryDto): string {
        // Unique job per tweet
        return `tweet-summary:${dto.tweet_id}`;
    }

    // Override queueJob to customize cleanup for fixed jobId
    async queueGenerateSummary(dto: GenerateTweetSummaryDto) {
        try {
            const jobId = this.getJobId(dto);

            const job = await this.queue.add(this.job_name, dto, {
                jobId,
                priority: JOB_PRIORITIES.MEDIUM,
                delay: JOB_DELAYS.IMMEDIATE,
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },

                // Keep job while running to enforce single-job lock
                removeOnComplete: false,
                removeOnFail: true,
            });

            return { success: true, job_id: job.id };
        } catch (error) {
            this.logger.error('Failed to queue AI summary generation:', error);
            return { success: false, error: error.message };
        }
    }
}
