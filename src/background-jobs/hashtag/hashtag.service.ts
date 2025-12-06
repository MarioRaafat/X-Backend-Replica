import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { BackgroundJobsService } from '../background-jobs';
import { JOB_DELAYS, JOB_NAMES, JOB_PRIORITIES, QUEUE_NAMES } from '../constants/queue.constants';
import { HashtagJobDto } from './hashtag-job.dto';
import bull from 'bull';

@Injectable()
export class HashtagJobService extends BackgroundJobsService<HashtagJobDto> {
    constructor(@InjectQueue(QUEUE_NAMES.HASHTAG) queue: bull.Queue) {
        super(queue, JOB_NAMES.HASHTAG.UPDATE_HASHTAG, JOB_PRIORITIES.LOW, JOB_DELAYS.IMMEDIATE);
    }

    async queueHashtag(dto: HashtagJobDto, priority?: number, delay?: number) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to update hashtags'
        );
    }

    async getHashtagQueueStats() {
        return await this.getQueueStats();
    }

    async pauseHashtagQueue() {
        return await this.pauseQueue();
    }

    async resumeHashtagQueue() {
        return await this.resumeQueue();
    }

    async cleanHashtagQueue() {
        return await this.cleanQueue();
    }
}
