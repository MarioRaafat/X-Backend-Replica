import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Expo, ExpoPushErrorReceipt, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';

@Injectable()
export class FCMService {
    private logger = new Logger(FCMService.name);
    private expo: Expo;

    constructor(@InjectRepository(User) private readonly user_repository: Repository<User>) {
        // Initialize Expo SDK client
        this.expo = new Expo({
            useFcmV1: true,
        });
    }

    async sendToDevice(
        device_token: string,
        data: any,
        notification?: { title: string; body: string }
    ): Promise<ExpoPushTicket> {
        try {
            // Check that the push token is a valid Expo push token
            if (!Expo.isExpoPushToken(device_token)) {
                this.logger.error(
                    `Push token ${String(device_token)} is not a valid Expo push token`
                );
                throw new Error('Invalid Expo push token');
            }

            // Construct the Expo push message
            const message: ExpoPushMessage = {
                to: device_token,
                sound: 'default',
                title: notification?.title,
                body: notification?.body,
                subtitle: notification?.body,
                data: data,
            };

            // Send the push notification
            const ticket_chunk = await this.expo.sendPushNotificationsAsync([message]);
            const ticket = ticket_chunk[0];

            this.logger.log(`Expo push notification sent: ${JSON.stringify(ticket)}`);

            // Check for errors in the ticket
            if (ticket.status === 'error') {
                const error_ticket = ticket;
                const error_message = String(error_ticket.message || 'Unknown error');
                this.logger.error(`Error sending push notification: ${error_message}`);
                if (error_ticket.details?.error) {
                    this.logger.error(`Error code: ${String(error_ticket.details.error)}`);
                }
                throw new Error(error_message);
            }

            return ticket;
        } catch (err) {
            this.logger.error(`Expo push notification error: ${err.message}`);
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

            const notification_content = this.getNotificationContent(notification_type, payload);

            const notification = {
                title: notification_content.title,
                body: notification_content.body,
            };

            await this.sendToDevice(user.fcm_token, notification_content.data, notification);
            this.logger.log(`Notification sent via FCM to user ${user_id}`);
            return true;
        } catch (error) {
            this.logger.error(
                `Error sending FCM notification to user ${user_id}: ${error.message}`
            );
            return false;
        }
    }

    private getNotificationContent(
        type: NotificationType,
        payload: any
    ): { title: string; body: string; data: any } {
        switch (type) {
            case NotificationType.FOLLOW:
                return {
                    title: 'yapper',
                    body: `@${payload.follower_username || 'Someone'} followed you!`,
                    data: { user_id: payload.follower_id },
                };
            case NotificationType.MENTION:
                return {
                    title: `Mentioned by ${payload.mentioned_by?.name || 'Someone'}:`,
                    body: payload.tweet?.content || 'You were mentioned in a post',
                    data: { tweet_id: payload.tweet?.id || payload.tweet?.tweet_id },
                };
            case NotificationType.REPLY:
                return {
                    title: `${payload.replier?.name || 'Someone'} replied:`,
                    body: payload.reply_tweet?.content || 'replied to your post',
                    data: { tweet_id: payload.reply_tweet?.id || payload.reply_tweet?.tweet_id },
                };
            case NotificationType.QUOTE:
                return {
                    title: 'yapper',
                    body: `@${payload.quoted_by?.username || 'Someone'} quoted your post${
                        payload.quote?.content ? ` and said: ${payload.quote.content}` : ''
                    }`,
                    data: { tweet_id: payload.quote?.id || payload.quote?.tweet_id },
                };
            case NotificationType.LIKE: {
                const liker_name = payload.liker?.name || payload.likers?.[0]?.name || 'Someone';
                const liked_tweet_content =
                    payload.tweet?.content || payload.tweets?.[0]?.content || 'your post';
                const liked_tweet_id =
                    payload.tweet?.tweet_id || payload.tweet?.id || payload.tweets?.[0]?.id;
                return {
                    title: `Liked by ${liker_name}`,
                    body: liked_tweet_content,
                    data: { tweet_id: liked_tweet_id },
                };
            }
            case NotificationType.REPOST: {
                const reposter_name = payload.reposter?.name || 'Someone';
                const reposted_tweet_content = payload.tweet?.content || 'your post';
                const reposted_tweet_id =
                    payload.tweet?.tweet_id || payload.tweet?.id || payload.tweets?.[0]?.id;
                return {
                    title: `Reposted by ${reposter_name}:`,
                    body: reposted_tweet_content,
                    data: { tweet_id: reposted_tweet_id },
                };
            }
            case NotificationType.MESSAGE:
                return {
                    title: payload.sender?.name || 'New Message',
                    body: payload.content || 'You have a new message',
                    data: { chat_id: payload.chat_id },
                };
            default:
                return {
                    title: 'yapper',
                    body: 'You have a new notification',
                    data: {},
                };
        }
    }

    /**
     * Send push notifications to multiple devices in batches
     * @param messages Array of Expo push messages
     * @returns Array of push tickets
     */
    async sendBatchNotifications(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
        try {
            // Filter out invalid tokens
            const valid_messages = messages.filter((message) => {
                if (!Expo.isExpoPushToken(message.to as string)) {
                    const token = Array.isArray(message.to) ? message.to.join(', ') : message.to;
                    this.logger.error(`Invalid Expo push token: ${token}`);
                    return false;
                }
                return true;
            });

            if (valid_messages.length === 0) {
                this.logger.warn('No valid push tokens to send notifications to');
                return [];
            }

            // Chunk the notifications to respect Expo's batch size limits
            const chunks = this.expo.chunkPushNotifications(valid_messages);
            const tickets: ExpoPushTicket[] = [];

            // Send each chunk
            for (const chunk of chunks) {
                try {
                    const ticket_chunk = await this.expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticket_chunk);

                    // Log any errors
                    ticket_chunk.forEach((ticket, index) => {
                        if (ticket.status === 'error') {
                            const token = Array.isArray(chunk[index].to)
                                ? chunk[index].to.join(', ')
                                : chunk[index].to;
                            this.logger.error(
                                `Error sending notification to ${token}: ${ticket.message}`
                            );
                            if (ticket.details?.error) {
                                this.logger.error(`Error code: ${ticket.details.error}`);
                            }
                        }
                    });
                } catch (error) {
                    this.logger.error(`Error sending push notification chunk: ${error.message}`);
                }
            }

            return tickets;
        } catch (error) {
            this.logger.error(`Error in batch notification send: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check the receipts for sent push notifications
     * @param receipt_ids Array of receipt IDs from push tickets
     */
    async checkPushNotificationReceipts(receipt_ids: string[]): Promise<void> {
        try {
            // Chunk the receipt IDs
            const receipt_id_chunks = this.expo.chunkPushNotificationReceiptIds(receipt_ids);

            for (const chunk of receipt_id_chunks) {
                try {
                    const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

                    // Check each receipt for errors
                    for (const receipt_id in receipts) {
                        const receipt = receipts[receipt_id];

                        if (receipt.status === 'ok') {
                            continue;
                        }

                        if (receipt.status === 'error') {
                            const error_receipt = receipt;
                            this.logger.error(
                                `Error in push notification receipt ${receipt_id}: ${error_receipt.message}`
                            );

                            if (error_receipt.details?.error) {
                                this.logger.error(`Error code: ${error_receipt.details.error}`);

                                if (error_receipt.details.error === 'DeviceNotRegistered') {
                                    this.logger.warn(
                                        `Device token is no longer valid: ${receipt_id}`
                                    );
                                    await this.user_repository.update(receipt_id, {
                                        fcm_token: null,
                                    });
                                } else if (error_receipt.details.error === 'MessageTooBig') {
                                    this.logger.warn(
                                        `Notification payload too large for receipt: ${receipt_id}`
                                    );
                                } else if (error_receipt.details.error === 'MessageRateExceeded') {
                                    this.logger.warn(
                                        `Rate limit exceeded for receipt: ${receipt_id}`
                                    );
                                }
                            }
                        }
                    }
                } catch (error) {
                    this.logger.error(
                        `Error fetching push notification receipts: ${error.message}`
                    );
                }
            }
        } catch (error) {
            this.logger.error(`Error checking push notification receipts: ${error.message}`);
            throw error;
        }
    }
}
