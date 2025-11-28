import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notifications.entity';
import { BaseNotificationEntity } from './entities/base-notification.entity';
import { Not } from 'typeorm';
import { NotificationType } from './enums/notification-types';

@Injectable()
export class NotificationsService {
    private readonly key = 'notifications';

    constructor(
        @InjectModel(Notification.name)
        private readonly notificationModel: Model<Notification>
    ) {}

    async handleMessage(data: any): Promise<void> {
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

    // async getUserNotifications(user_id: string): Promise<Notification | null> {
    //     const userNotifications = await this.notificationModel
    //         .findOne({ user: user_id })
    //         .lean<Notification>()
    //         .exec();
    //     return userNotifications;
    // }

    // Just for testing, but notifications messages will be sent from other services
    async sendNotification(notification: any): Promise<void> {
        console.log('Send');
    }

    // Test function
    async temp(object: any) {}
}
