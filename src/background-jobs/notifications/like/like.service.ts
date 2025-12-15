import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { LikeBackGroundNotificationJobDTO } from './like.dto';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from 'src/background-jobs/constants/queue.constants';
import type { Queue } from 'bull';

@Injectable()
export class LikeJobService extends BackgroundJobsService<LikeBackGroundNotificationJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly reply_queue: Queue) {
        super(reply_queue, JOB_NAMES.NOTIFICATION.LIKE, JOB_PRIORITIES.HIGH, JOB_DELAYS.IMMEDIATE);
    }

    async queueLikeNotification(
        dto: LikeBackGroundNotificationJobDTO,
        priority?: number,
        delay?: number
    ) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue like notification job:'
        );
    }
}
