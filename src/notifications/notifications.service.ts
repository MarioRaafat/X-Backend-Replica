import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notifications.entity';
import { BaseNotificationEntity } from './entities/base-notification.entity';
import { NotificationType } from './enums/notification-types';
import { NotificationsGateway } from './gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { In, Repository } from 'typeorm';
import { ReplyNotificationEntity } from './entities/reply-notification.entity';
import { RepostNotificationEntity } from './entities/repost-notification.entity';
import { QuoteNotificationEntity } from './entities/quote-notification.entity';
import { LikeNotificationEntity } from './entities/like-notification.entity';
import { FollowNotificationEntity } from './entities/follow-notification.entity';
import { NotificationDto } from './dto/notifications-response.dto';
import { BackgroundJobsModule } from 'src/background-jobs';
import { ClearJobService } from 'src/background-jobs/notifications/clear/clear.service';

@Injectable()
export class NotificationsService {
    private readonly key = 'notifications';

    constructor(
        @InjectModel(Notification.name)
        private readonly notificationModel: Model<Notification>,
        private readonly notificationsGateway: NotificationsGateway,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Tweet)
        private readonly tweetRepository: Repository<Tweet>,
        private readonly clear_jobs_service: ClearJobService
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

    async saveNotificationAndSend(
        user_id: string,
        notification_data: BaseNotificationEntity,
        payload: any
    ): Promise<void> {
        if (!notification_data.created_at) notification_data.created_at = new Date();
        await this.notificationModel.updateOne(
            { user: user_id },
            {
                $push: {
                    notifications: {
                        $each: [notification_data],
                        $position: 0,
                        $slice: 50,
                    },
                },
            },
            { upsert: true }
        );

        this.notificationsGateway.sendToUser(notification_data.type, user_id, payload);
    }

    async sendNotificationOnly(
        notification_type: NotificationType,
        user_id: string,
        payload: any
    ): Promise<void> {
        this.notificationsGateway.sendToUser(notification_type, user_id, payload);
    }

    async getUserNotifications(user_id: string): Promise<NotificationDto[]> {
        const user_notifications = await this.notificationModel
            .findOne({ user: user_id })
            .lean()
            .exec();

        console.log('User notifications found:', user_notifications);

        if (
            !user_notifications ||
            !user_notifications.notifications ||
            user_notifications.notifications.length === 0
        ) {
            console.log('No notifications found for user:', user_id);
            return [];
        }

        console.log('Notifications count:', user_notifications.notifications.length);

        const user_ids = new Set<string>();
        const tweet_ids = new Set<string>();

        user_notifications.notifications.forEach((notification: any) => {
            switch (notification.type) {
                case NotificationType.FOLLOW: {
                    const follow_notification = notification as FollowNotificationEntity;
                    if (follow_notification.follower_id) {
                        user_ids.add(follow_notification.follower_id);
                    }
                    break;
                }
                case NotificationType.LIKE: {
                    const like_notification = notification as LikeNotificationEntity;
                    if (like_notification.liked_by) {
                        user_ids.add(like_notification.liked_by);
                    }
                    if (like_notification.tweet_id) {
                        tweet_ids.add(like_notification.tweet_id);
                    }
                    break;
                }
                case NotificationType.QUOTE: {
                    const quote_notification = notification as QuoteNotificationEntity;
                    if (quote_notification.quoted_by) {
                        user_ids.add(quote_notification.quoted_by);
                    }
                    if (quote_notification.quote_tweet_id) {
                        tweet_ids.add(quote_notification.quote_tweet_id);
                    }
                    if (quote_notification.parent_tweet_id) {
                        tweet_ids.add(quote_notification.parent_tweet_id);
                    }
                    break;
                }
                case NotificationType.REPLY: {
                    const reply_notification = notification as ReplyNotificationEntity;
                    if (reply_notification.replied_by) {
                        user_ids.add(reply_notification.replied_by);
                    }
                    if (reply_notification.reply_tweet_id) {
                        tweet_ids.add(reply_notification.reply_tweet_id);
                    }
                    if (reply_notification.original_tweet_id) {
                        tweet_ids.add(reply_notification.original_tweet_id);
                    }
                    break;
                }
                case NotificationType.REPOST: {
                    const repost_notification = notification as RepostNotificationEntity;
                    if (repost_notification.reposted_by) {
                        user_ids.add(repost_notification.reposted_by);
                    }
                    if (repost_notification.tweet_id) {
                        tweet_ids.add(repost_notification.tweet_id);
                    }
                    break;
                }
            }
        });

        // Fetch all data in parallel
        const [users, tweets] = await Promise.all([
            user_ids.size > 0
                ? this.userRepository.find({
                      where: { id: In(Array.from(user_ids)) },
                      select: ['id', 'username', 'name', 'avatar_url', 'email'],
                  })
                : [],
            tweet_ids.size > 0
                ? this.tweetRepository.find({
                      where: { tweet_id: In(Array.from(tweet_ids)) },
                  })
                : [],
        ]);

        const user_map = new Map<string, User>(
            users.map((user) => [user.id, user] as [string, User])
        );
        const tweet_map = new Map<string, Tweet>(
            tweets.map((tweet) => [tweet.tweet_id, tweet] as [string, Tweet])
        );

        console.log('Fetched users count:', users.length);
        console.log('Fetched tweets count:', tweets.length);
        console.log('User IDs needed:', Array.from(user_ids));
        console.log('Tweet IDs needed:', Array.from(tweet_ids));

        const missing_tweet_ids = new Set<string>();

        const response_notifications: NotificationDto[] = user_notifications.notifications
            .map((notification: any) => {
                switch (notification.type) {
                    case NotificationType.FOLLOW: {
                        const follow_notification = notification as FollowNotificationEntity;
                        const follower = user_map.get(follow_notification.follower_id);
                        if (!follower) {
                            return null;
                        }
                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            follower,
                        } as NotificationDto;
                    }
                    case NotificationType.LIKE: {
                        const like_notification = notification as LikeNotificationEntity;
                        const liker = user_map.get(like_notification.liked_by);
                        const tweet = tweet_map.get(like_notification.tweet_id);
                        if (!liker || !tweet) {
                            if (!tweet && like_notification.tweet_id) {
                                missing_tweet_ids.add(like_notification.tweet_id);
                            }
                            return null;
                        }
                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            liker,
                            tweet,
                        } as NotificationDto;
                    }
                    case NotificationType.QUOTE: {
                        const quote_notification = notification as QuoteNotificationEntity;
                        const quoter = user_map.get(quote_notification.quoted_by);
                        const quote_tweet = tweet_map.get(quote_notification.quote_tweet_id);
                        const parent_tweet = tweet_map.get(quote_notification.parent_tweet_id);
                        if (!quoter || !quote_tweet || !parent_tweet) {
                            if (!quote_tweet && quote_notification.quote_tweet_id) {
                                missing_tweet_ids.add(quote_notification.quote_tweet_id);
                            }
                            if (!parent_tweet && quote_notification.parent_tweet_id) {
                                missing_tweet_ids.add(quote_notification.parent_tweet_id);
                            }
                            return null;
                        }
                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            quoter,
                            quote_tweet,
                            parent_tweet,
                        } as NotificationDto;
                    }
                    case NotificationType.REPLY: {
                        const reply_notification = notification as ReplyNotificationEntity;
                        const replier = user_map.get(reply_notification.replied_by);
                        const reply_tweet = reply_notification.reply_tweet_id
                            ? tweet_map.get(reply_notification.reply_tweet_id)
                            : null;
                        const original_tweet = tweet_map.get(reply_notification.original_tweet_id);

                        // We need replier and original_tweet, reply_tweet is optional
                        if (!replier || !original_tweet) {
                            if (!original_tweet && reply_notification.original_tweet_id) {
                                missing_tweet_ids.add(reply_notification.original_tweet_id);
                            }
                            if (reply_notification.reply_tweet_id && !reply_tweet) {
                                missing_tweet_ids.add(reply_notification.reply_tweet_id);
                            }
                            return null;
                        }
                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            replier,
                            reply_tweet,
                            original_tweet,
                            conversation_id: reply_notification.conversation_id,
                        } as NotificationDto;
                    }
                    case NotificationType.REPOST: {
                        const repost_notification = notification as RepostNotificationEntity;
                        const reposter = user_map.get(repost_notification.reposted_by);
                        const tweet = tweet_map.get(repost_notification.tweet_id);
                        if (!reposter || !tweet) {
                            if (!tweet && repost_notification.tweet_id) {
                                missing_tweet_ids.add(repost_notification.tweet_id);
                            }
                            return null;
                        }
                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            reposter,
                            tweet,
                        } as NotificationDto;
                    }
                    default:
                        return null;
                }
            })
            .filter((notification): notification is NotificationDto => notification !== null);

        console.log('Response notifications count:', response_notifications.length);
        console.log('Missing tweet IDs:', Array.from(missing_tweet_ids));

        // Clean up notifications with missing tweets
        if (missing_tweet_ids.size > 0) {
            await this.clear_jobs_service.queueClearNotification({
                user_id,
                tweet_ids: Array.from(missing_tweet_ids),
            });
        }

        return response_notifications;
    }

    async deleteNotificationsByTweetIds(user_id: string, tweet_ids: string[]): Promise<void> {
        try {
            console.log(tweet_ids);

            // Delete notifications where any tweet-related field matches the provided tweet IDs
            for (const tweet_id of tweet_ids) {
                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            notifications: {
                                $or: [
                                    { tweet_id: tweet_id },
                                    { reply_tweet_id: tweet_id },
                                    { original_tweet_id: tweet_id },
                                    { quote_tweet_id: tweet_id },
                                    { parent_tweet_id: tweet_id },
                                ],
                            },
                        },
                    }
                );
            }
        } catch (error) {
            console.error('Error deleting notifications by tweet IDs:', error);
            throw error;
        }
    }

    async getUserMentionsNotifications(_user_id: string): Promise<void> {}

    async markNotificationsAsSeen(_user_id: string): Promise<void> {}

    async getUnseenCount(_user_id: string): Promise<void> {}

    // async getUserNotifications(user_id: string): Promise<Notification | null> {
    //     const user_notifications = await this.notificationModel
    //         .findOne({ user: user_id })
    //         .lean<Notification>()
    //         .exec();
    //     return user_notifications;
    // }

    // Just for testing, but notifications messages will be sent from other services
    async sendNotification(notification: any): Promise<void> {
        console.log('Send');
    }

    // Test function
    async temp(object: any) {}
}
