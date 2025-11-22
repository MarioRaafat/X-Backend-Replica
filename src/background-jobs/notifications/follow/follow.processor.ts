import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import { reset_password_email_object, verification_email_object } from 'src/constants/variables';
import { FollowBackGroundNotificationJobDTO } from './follow.dto';
import { NotificationsGateway } from 'src/notifications/gateway';
import { NotificationType } from 'src/notifications/enums/notification-types';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class FollowProcessor {
    private readonly logger = new Logger(FollowProcessor.name);

    constructor(private readonly notification_gateway: NotificationsGateway) {}

    @Process(JOB_NAMES.NOTIFICATION.FOLLOW)
    async handleSendFollowNotification(job: Job<FollowBackGroundNotificationJobDTO>) {
        try {
            const { followed_id, follower_id, followed_avatar_url, follower_name, action } =
                job.data;

            this.notification_gateway.sendToUser(NotificationType.FOLLOW, followed_id, {
                type: 'follow',
                action,
                follower_id,
                follower_name,
                followed_avatar_url,
            });
        } catch (error) {
            this.logger.error(`Error processing OTP email job ${job.id}:`, error);
            throw error;
        }
    }
}
