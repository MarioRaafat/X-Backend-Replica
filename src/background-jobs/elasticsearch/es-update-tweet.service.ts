import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { JOB_DELAYS, JOB_NAMES, JOB_PRIORITIES, QUEUE_NAMES } from '../constants/queue.constants';
import { BackgroundJobsService } from 'src/background-jobs/background-jobs';
import { ElasticsearchSyncTweetDto } from './elasticsearch-sync-tweet.dto';

@Injectable()
export class EsUpdateTweetJobService extends BackgroundJobsService<ElasticsearchSyncTweetDto> {
    constructor(@InjectQueue(QUEUE_NAMES.ELASTICSEARCH) private elasticsearch_queue: Queue) {
        super(
            elasticsearch_queue,
            JOB_NAMES.ELASTICSEARCH.UPDATE_TWEET,
            JOB_PRIORITIES.HIGH,
            JOB_DELAYS.IMMEDIATE
        );
    }

    async queueUpdateTweet(dto: ElasticsearchSyncTweetDto, priority?: number, delay?: number) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue elasticsearch update tweet job:'
        );
    }
}
