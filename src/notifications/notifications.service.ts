import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notifications.entity';
import { BaseNotificationEntity } from './entities/base-notification.entity';
import { Not } from 'typeorm';
import { NotificationType } from './enums/notification-types';

// interface NotificationMessage {
//     userId: string;
//     notification: BaseNotificationEntity;
// }

@Injectable()
export class NotificationsService implements OnModuleInit {
    // private readonly key = 'notifications';

    // constructor(
    //     @InjectModel(Notification.name)
    //     private readonly notificationModel: Model<Notification>,
    // ) {}

    async onModuleInit() {}

    // async handleMessage(data: NotificationMessage): Promise<void> {
    //     try {
    //         const { userId, notification } = data;

    //         await this.notificationModel.updateOne(
    //             { user: userId },
    //             {
    //                 $push: {
    //                     notifications: {
    //                         $each: [notification],
    //                         $position: 0,
    //                         $slice: 50,
    //                     },
    //                 },
    //             },
    //             { upsert: true }
    //         );
    //     } catch (error) {
    //         console.error(error);
    //         throw error;
    //     }
    // }

    // async getUserMentionsNotifications(userId: string) {}

    // async markNotificationsAsSeen(userId: string) {}

    // async getUnseenCount(userId: string) {}

    // async getUserNotifications(userId: string): Promise<Notification | null> {
    //     const userNotifications = await this.notificationModel
    //         .findOne({ user: userId })
    //         .lean<Notification>()
    //         .exec();
    //     return userNotifications;
    // }

    // // Just for testing, but notifications messages will be sent from other services
    // async sendNotification(notification: NotificationMessage): Promise<void> {
    //     console.log('Send');
    // }

    // // Test function
    // async temp(object: any) {
    //     console.log(object);
    //     const baseNotification: BaseNotificationEntity = {
    //         type: NotificationType.LIKE,
    //         created_at: new Date(),
    //         updated_at: new Date(),
    //         trigger_ids: [],
    //         user_ids: [],
    //         seen: false,
    //         content: 'Alyaa liked your post',
    //     };

    //     await this.sendNotification({
    //         userId: object.user,
    //         notification: baseNotification,
    //     });
    // }
}
