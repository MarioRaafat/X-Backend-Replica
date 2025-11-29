import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { Tweet } from 'src/tweets/entities';
import { RepostBackGroundNotificationJobDTO } from './repost.dto';
import { RepostNotificationEntity } from 'src/notifications/entities/repost-notification.entity';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class RepostProcessor {
    private readonly logger = new Logger(RepostProcessor.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet) private readonly tweet_repository: Repository<Tweet>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.REPOST)
    async handleSendRepostNotification(
        job: Job<RepostBackGroundNotificationJobDTO>
    ): Promise<void> {
        try {
            const { repost_to, reposted_by, tweet_id, tweet, action } = job.data;

            if (action === 'remove') {
                await this.notificationsService.sendNotificationOnly(
                    NotificationType.REPOST,
                    repost_to,
                    {
                        ...job.data,
                        reposted_by,
                    }
                );
            } else {
                const reposter = await this.user_repository.findOne({
                    where: { id: reposted_by },
                    select: ['username', 'email', 'name', 'avatar_url'],
                });

                if (!reposter) {
                    this.logger.warn(`Reposter with ID ${reposted_by} not found.`);
                    return;
                }

                reposter.id = reposted_by;

                if (!tweet) {
                    this.logger.warn(`Tweet with ID ${tweet_id} not found.`);
                    return;
                }

                const notification_entity: RepostNotificationEntity = Object.assign(
                    new RepostNotificationEntity(),
                    {
                        type: NotificationType.REPOST,
                        tweet_id: tweet.tweet_id,
                        reposted_by,
                        created_at: new Date(),
                    }
                );

                await this.notificationsService.saveNotificationAndSend(
                    repost_to,
                    notification_entity,
                    {
                        reposter: reposter,
                        ...job.data,
                    }
                );
            }
        } catch (error) {
            this.logger.error(`Error processing repost job ${job.id}:`, error);
            throw error;
        }
    }
}
