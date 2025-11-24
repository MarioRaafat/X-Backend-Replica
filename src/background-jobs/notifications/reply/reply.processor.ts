import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsGateway } from 'src/notifications/gateway';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { ReplyBackGroundNotificationJobDTO } from './reply.dto';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class ReplyProcessor {
    private readonly logger = new Logger(ReplyProcessor.name);

    constructor(
        private readonly notification_gateway: NotificationsGateway,
        @InjectRepository(User)
        private readonly user_repository: Repository<User>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.REPLY)
    async handleSendReplyNotification(job: Job<ReplyBackGroundNotificationJobDTO>) {
        try {
            const { reply_to, replied_by } = job.data;

            const replier = await this.user_repository.findOne({
                where: { id: replied_by },
                select: ['id', 'username', 'email', 'name', 'avatar_url'],
            });

            if (!replier) {
                this.logger.warn(`Replier with ID ${replied_by} not found.`);
                return;
            }

            this.notification_gateway.sendToUser(NotificationType.REPLY, reply_to, {
                type: NotificationType.REPLY,
                ...job.data,
                replier,
            });
        } catch (error) {
            this.logger.error(`Error processing reply job ${job.id}:`, error);
            throw error;
        }
    }
}
