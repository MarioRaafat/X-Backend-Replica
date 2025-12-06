import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from '../constants/queue.constants';
import { Logger } from '@nestjs/common';
import { TrendService } from 'src/trend/trend.service';
import bull from 'bull';
import { HashtagJobDto } from './hashtag-job.dto';

@Processor(QUEUE_NAMES.HASHTAG)
export class HashtagProcessor {
    private readonly logger = new Logger(HashtagProcessor.name);

    constructor(private readonly trend_service: TrendService) {}

    @Process(JOB_NAMES.HASHTAG.UPDATE_HASHTAG)
    async handleUpdateHashtags(job: bull.Job<HashtagJobDto>) {
        const { hashtags, timestamp } = job.data;
        await this.trend_service.insertCandidateHashtags(job.data);
        await this.trend_service.insertCandidateCategories(job.data);

        await this.trend_service.updateHashtagCounts(job.data);
    }
}
