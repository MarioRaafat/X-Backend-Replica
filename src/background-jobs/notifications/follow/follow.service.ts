import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { FollowBackGroundNotificationJobDTO } from './follow.dto';
import { BackgroundJobsService } from 'src/background-jobs/background-jobs';

@Injectable()
export class FollowJobService extends BackgroundJobsService<FollowBackGroundNotificationJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private follow_queue: Queue) {
        super(
            follow_queue,
            JOB_NAMES.NOTIFICATION.FOLLOW,
            JOB_PRIORITIES.HIGH,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueFollowNotification(
        dto: FollowBackGroundNotificationJobDTO,
        priority?: number,
        delay?: number
    ) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue follow notification job:'
        );
    }
}
