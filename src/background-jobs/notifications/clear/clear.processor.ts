import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ClearBackGroundNotificationJobDTO } from './clear.dto';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class ClearProcessor {
    private readonly logger = new Logger(ClearProcessor.name);

    constructor(private readonly notifications_service: NotificationsService) {}

    @Process(JOB_NAMES.NOTIFICATION.CLEAR)
    async handleClearNotification(job: Job<ClearBackGroundNotificationJobDTO>) {
        try {
            const { user_id, tweet_ids, user_ids } = job.data;

            if (!user_id || (!tweet_ids?.length && !user_ids?.length)) {
                this.logger.warn(
                    `Invalid job data for clear notification job ${job.id}: user_id=${user_id}, tweet_ids count=${tweet_ids?.length || 0}, user_ids count=${user_ids?.length || 0}`
                );
                return;
            }

            if (tweet_ids?.length) {
                console.log('Clearing notifications for user:', user_id, 'Tweet IDs:', tweet_ids);
                await this.notifications_service.deleteNotificationsByTweetIds(user_id, tweet_ids);
                this.logger.log(
                    `Successfully cleared ${tweet_ids.length} notification(s) by tweet IDs for user ${user_id}`
                );
            }

            if (user_ids?.length) {
                console.log('Clearing notifications for user:', user_id, 'User IDs:', user_ids);
                await this.notifications_service.cleanupNotificationsByUserIds(user_id, user_ids);
                this.logger.log(
                    `Successfully cleared ${user_ids.length} notification(s) by user IDs for user ${user_id}`
                );
            }
        } catch (error) {
            this.logger.error(`Error processing clear notification job ${job.id}:`, error);
            throw error;
        }
    }
}
