import { Process, Processor } from '@nestjs/bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import type { Job } from 'bull';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { MessageBackGroundNotificationJobDTO } from './message.dto';
import { Message } from 'src/messages/entities/message.entity';
import { MessageNotificationEntity } from 'src/notifications/entities/message-notification.entity';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class MessageProcessor {
    private readonly logger = new Logger(MessageProcessor.name);

    constructor(
        private readonly notifications_service: NotificationsService,
        @InjectRepository(User) private readonly user_repository: Repository<User>,
        @InjectRepository(Message) private readonly message_repository: Repository<Message>
    ) {}

    @Process(JOB_NAMES.NOTIFICATION.MESSAGE)
    async handleSendMessageNotification(job: Job<MessageBackGroundNotificationJobDTO>) {
        try {
            const { sent_to, sent_by, message, chat_id } = job.data;

            const sender = await this.user_repository.findOne({
                where: { id: sent_by },
                select: ['id', 'username', 'email', 'name', 'avatar_url'],
            });

            if (!sender) {
                this.logger.warn(`Sender with ID ${sent_by} not found.`);
                return;
            }

            const notification_entity: MessageNotificationEntity = Object.assign(
                new MessageNotificationEntity(),
                {
                    type: NotificationType.MESSAGE,
                    message_id: message?.id,
                    sent_by,
                    chat_id,
                    created_at: new Date(),
                }
            );

            await this.notifications_service.saveNotificationAndSend(sent_to, notification_entity, {
                type: NotificationType.MESSAGE,
                sender,
                ...job.data,
            });
        } catch (error) {
            this.logger.error(`Error processing message job ${job.id}:`, error);
            throw error;
        }
    }
}
