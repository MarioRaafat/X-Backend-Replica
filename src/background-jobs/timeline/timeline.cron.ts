import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanupOldTweetsJobService } from './timeline.service';

@Injectable()
export class TimelineCron {
    constructor(private readonly cleanup_old_tweets_job_service: CleanupOldTweetsJobService) {}

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async handleDailyCleanup() {
        console.log('[Timeline Cron] Starting daily cleanup of old tweets');
        await this.cleanup_old_tweets_job_service.queueCleanupOldTweets({});
    }
}
