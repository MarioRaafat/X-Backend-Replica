import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { LikeBackGroundNotificationJobDTO } from './like.dto';
import { Tweet } from 'src/tweets/entities';
import { LikeNotificationEntity } from 'src/notifications/entities/like-notification.entity';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class LikeProcessor {
    private readonly logger = new Logger(LikeProcessor.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet) private readonly tweet_repository: Repository<Tweet>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.LIKE)
    async handleSendLikeNotification(job: Job<LikeBackGroundNotificationJobDTO>) {
        try {
            const { like_to, liked_by, tweet_id, action } = job.data;

            if (action === 'remove') {
                this.notificationsService.sendNotificationOnly(NotificationType.LIKE, like_to, {
                    ...job.data,
                    liked_by,
                });
            } else {
                const liker = await this.user_repository.findOne({
                    where: { id: liked_by },
                    select: ['id', 'username', 'email', 'name', 'avatar_url'],
                });

                if (!liker) {
                    this.logger.warn(`Liker with ID ${liked_by} not found.`);
                    return;
                }

                const notification_entity: LikeNotificationEntity = Object.assign(
                    new LikeNotificationEntity(),
                    {
                        type: NotificationType.LIKE,
                        tweet_id,
                        liked_by,
                        created_at: new Date(),
                    }
                );

                await this.notificationsService.saveNotificationAndSend(
                    like_to,
                    notification_entity,
                    {
                        type: NotificationType.LIKE,
                        liker,
                        ...job.data,
                    }
                );
            }
        } catch (error) {
            this.logger.error(`Error processing like job ${job.id}:`, error);
            throw error;
        }
    }
}
