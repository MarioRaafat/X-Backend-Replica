import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { ReplyBackGroundNotificationJobDTO } from './reply.dto';
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
export class ReplyJobService extends BackgroundJobsService<ReplyBackGroundNotificationJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private reply_queue: Queue) {
        super(reply_queue, JOB_NAMES.NOTIFICATION.REPLY, JOB_PRIORITIES.HIGH, JOB_DELAYS.IMMEDIATE);
    }

    async queueReplyNotification(
        dto: ReplyBackGroundNotificationJobDTO,
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
