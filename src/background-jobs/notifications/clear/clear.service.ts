import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { ClearBackGroundNotificationJobDTO } from './clear.dto';

@Injectable()
export class ClearJobService extends BackgroundJobsService<ClearBackGroundNotificationJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private clear_queue: Queue) {
        super(clear_queue, JOB_NAMES.NOTIFICATION.CLEAR, JOB_PRIORITIES.HIGH, JOB_DELAYS.IMMEDIATE);
    }

    async queueClearNotification(
        dto: ClearBackGroundNotificationJobDTO,
        priority?: number,
        delay?: number
    ) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue clear notification job:'
        );
    }
}
