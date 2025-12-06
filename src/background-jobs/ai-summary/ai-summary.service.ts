import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BackgroundJobsService } from '../background-jobs';
import { JOB_NAMES, JOB_PRIORITIES, JOB_DELAYS, QUEUE_NAMES } from '../constants/queue.constants';
import type { GenerateTweetSummaryDto } from './ai-summary.dto';

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

    async queueGenerateSummary(dto: GenerateTweetSummaryDto) {
        return this.queueJob(
            dto,
            JOB_PRIORITIES.MEDIUM,
            JOB_DELAYS.IMMEDIATE,
            'Failed to queue AI summary generation:'
        );
    }
}
