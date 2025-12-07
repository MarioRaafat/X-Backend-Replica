import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as admin from 'firebase-admin';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';

@Injectable()
export class FCMService {
    private logger = new Logger(FCMService.name);

    constructor(@InjectRepository(User) private readonly user_repository: Repository<User>) {
        // Initialize Firebase Admin SDK
        const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: private_key,
            }),
        });
    }

    async sendToDevice(
        device_token: string,
        data: any,
        notification?: { title: string; body: string }
    ) {
        try {
            const message: admin.messaging.Message = {
                token: device_token,
                data: data,
                notification: notification,
            };

            const response = await admin.messaging().send(message);
            this.logger.log(`FCM Sent: ${response}`);

            return response;
        } catch (err) {
            this.logger.error(`FCM Error: ${err.message}`);
            throw err;
        }
    }

    async addUserDeviceToken(user_id: string, device_token: string) {
        // Implementation to store the device token associated with the user
        try {
            await this.user_repository.update(user_id, { fcm_token: device_token });
        } catch (error) {
            this.logger.error(`Error saving FCM token for user ${user_id}: ${error.message}`);
            throw error;
        }
    }

    async removeUserDeviceToken(user_id: string) {
        // Implementation to remove the device token associated with the user
        try {
            await this.user_repository.update(user_id, { fcm_token: null });
        } catch (error) {
            this.logger.error(`Error removing FCM token for user ${user_id}: ${error.message}`);
            throw error;
        }
    }

    async sendNotificationToUserDevice(
        user_id: string,
        notification_type: NotificationType,
        payload: any
    ): Promise<boolean> {
        try {
            const user = await this.user_repository.findOne({
                where: { id: user_id },
                select: ['fcm_token'],
            });

            if (!user?.fcm_token) {
                this.logger.warn(`No FCM token found for user ${user_id}`);
                return false;
            }

            const notification = {
                title: `New ${notification_type.toUpperCase()}`,
                body: this.getNotificationBody(notification_type, payload),
            };

            const data = {
                type: notification_type,
                ...payload,
            };

            await this.sendToDevice(user.fcm_token, data, notification);
            this.logger.log(`Notification sent via FCM to user ${user_id}`);
            return true;
        } catch (error) {
            this.logger.error(
                `Error sending FCM notification to user ${user_id}: ${error.message}`
            );
            return false;
        }
    }

    private extractUsername(payload: any, type: NotificationType): string {
        const user_field_map = {
            [NotificationType.LIKE]: 'liker',
            [NotificationType.REPLY]: 'replier',
            [NotificationType.REPOST]: 'reposter',
            [NotificationType.QUOTE]: 'quoted_by',
            [NotificationType.MENTION]: 'mentioned_by',
            [NotificationType.MESSAGE]: 'sender',
            [NotificationType.FOLLOW]: null,
        };

        const user_field = user_field_map[type];

        if (type === NotificationType.FOLLOW) {
            return payload.follower_name || 'Someone';
        }

        if (user_field && payload[user_field]?.name) {
            return payload[user_field].name;
        }

        return 'Someone';
    }

    private getNotificationBody(type: NotificationType, payload: any): string {
        const username = this.extractUsername(payload, type);

        const notification_body = {
            [NotificationType.LIKE]: `${username} liked your tweet`,
            [NotificationType.REPLY]: `${username} replied to your tweet`,
            [NotificationType.REPOST]: `${username} reposted your tweet`,
            [NotificationType.QUOTE]: `${username} quoted your tweet`,
            [NotificationType.FOLLOW]: `${username} started following you`,
            [NotificationType.MENTION]: `${username} mentioned you in a tweet`,
            [NotificationType.MESSAGE]: `${username} sent you a message`,
        };

        return notification_body[type] || 'You have a new notification';
    }
}
