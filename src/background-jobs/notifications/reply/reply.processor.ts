import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { ReplyBackGroundNotificationJobDTO } from './reply.dto';
import { Tweet } from 'src/tweets/entities';
import { ReplyNotificationEntity } from 'src/notifications/entities/reply-notification.entity';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class ReplyProcessor {
    private readonly logger = new Logger(ReplyProcessor.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet) private readonly tweet_repository: Repository<Tweet>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.REPLY)
    async handleSendReplyNotification(job: Job<ReplyBackGroundNotificationJobDTO>) {
        try {
            const {
                reply_to,
                replied_by,
                reply_tweet_id,
                original_tweet_id,
                conversation_id,
                action,
            } = job.data;

            let payload: any;
            if (action === 'remove') {
                payload = {
                    ...job.data,
                    replied_by,
                };

                this.notificationsService.sendNotificationOnly(
                    NotificationType.REPLY,
                    reply_to,
                    payload
                );
            } else {
                const replier = await this.user_repository.findOne({
                    where: { id: replied_by },
                    select: ['username', 'email', 'name', 'avatar_url'],
                });

                if (!replier) {
                    this.logger.warn(`Replier with ID ${replied_by} not found.`);
                    return;
                }

                replier.id = replied_by;
                payload = {
                    type: NotificationType.REPLY,
                    replier,
                    ...job.data,
                };

                const notification_entity: ReplyNotificationEntity = Object.assign(
                    new ReplyNotificationEntity(),
                    {
                        type: NotificationType.REPLY,
                        reply_tweet_id,
                        original_tweet_id,
                        replied_by,
                        conversation_id,
                        created_at: new Date(),
                    }
                );

                await this.notificationsService.saveNotificationAndSend(
                    reply_to,
                    notification_entity,
                    payload
                );
            }
        } catch (error) {
            this.logger.error(`Error processing reply job ${job.id}:`, error);
            throw error;
        }
    }
}
