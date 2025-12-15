import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from 'src/background-jobs/constants/queue.constants';
import {
    ICleanupOldTweetsJobDTO,
    IInitTimelineQueueJobDTO,
    IRefillTimelineQueueJobDTO,
} from './timeline.dto';

@Injectable()
export class InitTimelineQueueJobService extends BackgroundJobsService<IInitTimelineQueueJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.TIMELINE) private timeline_queue: Queue) {
        super(
            timeline_queue,
            JOB_NAMES.TIMELINE.INIT_QUEUE,
            JOB_PRIORITIES.MEDIUM,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueInitTimelineQueue(dto: IInitTimelineQueueJobDTO, priority?: number, delay?: number) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue init timeline queue job:'
        );
    }
}

@Injectable()
export class RefillTimelineQueueJobService extends BackgroundJobsService<IRefillTimelineQueueJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.TIMELINE) private timeline_queue: Queue) {
        super(
            timeline_queue,
            JOB_NAMES.TIMELINE.REFILL_QUEUE,
            JOB_PRIORITIES.HIGH,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueRefillTimelineQueue(
        dto: IRefillTimelineQueueJobDTO,
        priority?: number,
        delay?: number
    ) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue refill timeline queue job:'
        );
    }
}

@Injectable()
export class CleanupOldTweetsJobService extends BackgroundJobsService<ICleanupOldTweetsJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.TIMELINE) private timeline_queue: Queue) {
        super(
            timeline_queue,
            JOB_NAMES.TIMELINE.CLEANUP_OLD_TWEETS,
            JOB_PRIORITIES.LOW,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueCleanupOldTweets(dto: ICleanupOldTweetsJobDTO, priority?: number, delay?: number) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue cleanup old tweets job:'
        );
    }
}
