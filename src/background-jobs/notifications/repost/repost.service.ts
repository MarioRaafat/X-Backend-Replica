import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from 'src/background-jobs/constants/queue.constants';
import type { Queue } from 'bull';
import { RepostBackGroundNotificationJobDTO } from './repost.dto';

@Injectable()
export class RepostJobService extends BackgroundJobsService<RepostBackGroundNotificationJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private repost_queue: Queue) {
        super(
            repost_queue,
            JOB_NAMES.NOTIFICATION.REPOST,
            JOB_PRIORITIES.HIGH,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueRepostNotification(
        dto: RepostBackGroundNotificationJobDTO,
        priority?: number,
        delay?: number
    ) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue repost notification job:'
        );
    }
}
