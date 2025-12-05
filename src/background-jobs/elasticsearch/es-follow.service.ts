import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { JOB_DELAYS, JOB_NAMES, JOB_PRIORITIES, QUEUE_NAMES } from '../constants/queue.constants';
import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { EsSyncFollowDto } from './dtos/es-sync-follow.dto';

@Injectable()
export class EsFollowJobService extends BackgroundJobsService<EsSyncFollowDto> {
    constructor(@InjectQueue(QUEUE_NAMES.ELASTICSEARCH) private elasticsearch_queue: Queue) {
        super(
            elasticsearch_queue,
            JOB_NAMES.ELASTICSEARCH.FOLLOW,
            JOB_PRIORITIES.HIGH,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueEsFollow(dto: EsSyncFollowDto, priority?: number, delay?: number) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue elasticsearch follow job:'
        );
    }
}
