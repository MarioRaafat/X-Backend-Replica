import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import { FollowBackGroundNotificationJobDTO } from './follow.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { FollowNotificationEntity } from 'src/notifications/entities/follow-notification.entity';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class FollowProcessor {
    private readonly logger = new Logger(FollowProcessor.name);

    constructor(
        private readonly notifications_service: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.FOLLOW)
    async handleSendFollowNotification(job: Job<FollowBackGroundNotificationJobDTO>) {
        try {
            const { followed_id, follower_id, action } = job.data;

            if (action === 'remove') {
                // Remove the notification from MongoDB
                const was_deleted = await this.notifications_service.removeFollowNotification(
                    followed_id,
                    follower_id
                );

                // Only send socket notification if deletion succeeded
                if (was_deleted) {
                    this.notifications_service.sendNotificationOnly(
                        NotificationType.FOLLOW,
                        followed_id,
                        {
                            type: NotificationType.FOLLOW,
                            ...job.data,
                        }
                    );
                }
            } else {
                const notification_entity: FollowNotificationEntity = Object.assign(
                    new FollowNotificationEntity(),
                    {
                        type: NotificationType.FOLLOW,
                        follower_id,
                        created_at: new Date(),
                    }
                );

                await this.notifications_service.saveNotificationAndSend(
                    followed_id,
                    notification_entity,
                    {
                        type: NotificationType.FOLLOW,
                        ...job.data,
                    }
                );
            }
        } catch (error) {
            this.logger.error(`Error processing follow notification job ${job.id}:`, error);
            throw error;
        }
    }
}
