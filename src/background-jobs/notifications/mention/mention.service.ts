import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { MentionBackGroundNotificationJobDTO } from './mention.dto';
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
export class MentionJobService extends BackgroundJobsService<MentionBackGroundNotificationJobDTO> {
    constructor(@InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly mention_queue: Queue) {
        super(
            mention_queue,
            JOB_NAMES.NOTIFICATION.MENTION,
            JOB_PRIORITIES.HIGH,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueMentionNotification(
        dto: MentionBackGroundNotificationJobDTO,
        priority?: number,
        delay?: number
    ) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue mention notification job:'
        );
    }
}
