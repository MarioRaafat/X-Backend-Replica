import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notifications.entity';
import { BaseNotificationEntity } from './entities/base-notification.entity';
import { Not } from 'typeorm';
import { NotificationType } from './enums/notification-types';

interface INotificationMessage {
    user_id: string;
    notification: BaseNotificationEntity;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
    private readonly key = 'notifications';

    constructor(
        @InjectModel(Notification.name)
        private readonly notificationModel: Model<Notification>,
        private readonly rabbit: RabbitmqService
    ) {}

    async onModuleInit() {
        await this.rabbit.subscribe(this.key, (data) => this.handleMessage(data));
    }

    async handleMessage(data: INotificationMessage): Promise<void> {
        try {
            const { user_id, notification } = data;

            await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $push: {
                        notifications: {
                            $each: [notification],
                            $position: 0,
                            $slice: 50,
                        },
                    },
                },
                { upsert: true }
            );
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getUserMentionsNotifications(user_id: string) {}

    async markNotificationsAsSeen(user_id: string) {}

    async getUnseenCount(user_id: string) {}

    async getUserNotifications(user_id: string): Promise<Notification | null> {
        const user_notifications = await this.notificationModel
            .findOne({ user: user_id })
            .lean<Notification>()
            .exec();
        return user_notifications;
    }

    // Just for testing, but notifications messages will be sent from other services
    async sendNotification(notification: INotificationMessage): Promise<void> {
        console.log('Send');

        await this.rabbit.publish(this.key, notification);
    }

    // Test function
    async temp(object: any) {
        console.log(object);
        const base_notification: BaseNotificationEntity = {
            type: NotificationType.LIKE,
            created_at: new Date(),
            updated_at: new Date(),
            trigger_ids: [],
            user_ids: [],
            seen: false,
            content: 'Alyaa liked your post',
        };

        await this.sendNotification({
            user_id: object.user,
            notification: base_notification,
        });
    }
}
