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
        private readonly tweetRepository: Repository<Tweet>
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

    async getUserNotifications(user_id: string): Promise<any[]> {
        const user_notifications = await this.notificationModel
            .findOne({ user: user_id })
            .lean()
            .exec();

        if (
            !user_notifications ||
            !user_notifications.notifications ||
            user_notifications.notifications.length === 0
        ) {
            return [];
        }

        const user_ids = new Set<string>();
        const tweet_ids = new Set<string>();

        user_notifications.notifications.forEach((notification: any) => {
            switch (notification.type) {
                case NotificationType.FOLLOW: {
                    const follow_notification = notification as FollowNotificationEntity;
                    user_ids.add(follow_notification.follower_id);
                    break;
                }
                case NotificationType.LIKE: {
                    const like_notification = notification as LikeNotificationEntity;
                    user_ids.add(like_notification.liked_by);
                    tweet_ids.add(like_notification.tweet_id);
                    break;
                }
                case NotificationType.QUOTE: {
                    const quote_notification = notification as QuoteNotificationEntity;
                    user_ids.add(quote_notification.quoted_by);
                    tweet_ids.add(quote_notification.quote_tweet_id);
                    tweet_ids.add(quote_notification.parent_tweet_id);
                    break;
                }
                case NotificationType.REPLY: {
                    const reply_notification = notification as ReplyNotificationEntity;
                    user_ids.add(reply_notification.replied_by);
                    tweet_ids.add(reply_notification.reply_tweet_id);
                    tweet_ids.add(reply_notification.original_tweet_id);
                    break;
                }
                case NotificationType.REPOST: {
                    const repost_notification = notification as RepostNotificationEntity;
                    user_ids.add(repost_notification.reposted_by);
                    tweet_ids.add(repost_notification.tweet_id);
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

        const response_notifications = user_notifications.notifications.map((notification: any) => {
            const base_notification = {
                type: notification.type,
                created_at: notification.created_at,
            };

            switch (notification.type) {
                case NotificationType.FOLLOW: {
                    const follow_notification = notification as FollowNotificationEntity;
                    return {
                        ...base_notification,
                        follower: user_map.get(follow_notification.follower_id),
                    };
                }
                case NotificationType.LIKE: {
                    const like_notification = notification as LikeNotificationEntity;
                    return {
                        ...base_notification,
                        liker: user_map.get(like_notification.liked_by),
                        tweet: tweet_map.get(like_notification.tweet_id),
                    };
                }
                case NotificationType.QUOTE: {
                    const quote_notification = notification as QuoteNotificationEntity;
                    return {
                        ...base_notification,
                        quoter: user_map.get(quote_notification.quoted_by),
                        quote_tweet: tweet_map.get(quote_notification.quote_tweet_id),
                        parent_tweet: tweet_map.get(quote_notification.parent_tweet_id),
                    };
                }
                case NotificationType.REPLY: {
                    const reply_notification = notification as ReplyNotificationEntity;
                    return {
                        ...base_notification,
                        replier: user_map.get(reply_notification.replied_by),
                        reply_tweet: tweet_map.get(reply_notification.reply_tweet_id),
                        original_tweet: tweet_map.get(reply_notification.original_tweet_id),
                        conversation_id: reply_notification.conversation_id,
                    };
                }
                case NotificationType.REPOST: {
                    const repost_notification = notification as RepostNotificationEntity;
                    return {
                        ...base_notification,
                        reposter: user_map.get(repost_notification.reposted_by),
                        tweet: tweet_map.get(repost_notification.tweet_id),
                    };
                }
                default:
                    return base_notification;
            }
        });

        return response_notifications;
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
