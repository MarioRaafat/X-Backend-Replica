import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { MessageBackGroundNotificationJobDTO } from './message.dto';
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
export class MessageJobService extends BackgroundJobsService<MessageBackGroundNotificationJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private message_queue: Queue) {
        super(
            message_queue,
            JOB_NAMES.NOTIFICATION.MESSAGE,
            JOB_PRIORITIES.HIGH,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueMessageNotification(
        dto: MessageBackGroundNotificationJobDTO,
        priority?: number,
        delay?: number
    ) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue message notification job:'
        );
    }
}
