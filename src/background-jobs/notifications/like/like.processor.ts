import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsGateway } from 'src/notifications/gateway';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { LikeBackGroundNotificationJobDTO } from './like.dto';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class LikeProcessor {
    private readonly logger = new Logger(LikeProcessor.name);

    constructor(
        private readonly notification_gateway: NotificationsGateway,
        @InjectRepository(User)
        private readonly user_repository: Repository<User>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.LIKE)
    async handleSendLikeNotification(job: Job<LikeBackGroundNotificationJobDTO>) {
        try {
            const { like_to, liked_by } = job.data;

            const liker = await this.user_repository.findOne({
                where: { id: liked_by },
                select: ['id', 'username', 'email', 'name', 'avatar_url'],
            });

            if (!liker) {
                this.logger.warn(`Liker with ID ${liked_by} not found.`);
                return;
            }

            this.notification_gateway.sendToUser(NotificationType.LIKE, like_to, {
                type: NotificationType.LIKE,
                ...job.data,
                liker,
            });
        } catch (error) {
            this.logger.error(`Error processing reply job ${job.id}:`, error);
            throw error;
        }
    }
}
