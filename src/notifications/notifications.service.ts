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

    async saveNotificationAndSend(
        user_id: string,
        notification_data: BaseNotificationEntity,
        payload: any
    ): Promise<void> {
        if (!notification_data.created_at) notification_data.created_at = new Date();

        // Normalize notification data to ensure arrays
        this.normalizeNotificationData(notification_data);

        // Check if we can aggregate this notification
        const aggregation_result = await this.tryAggregateNotification(user_id, notification_data);

        if (!aggregation_result.aggregated) {
            // If not aggregated, add as new notification
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

            // Send with 'add' action for new notification
            this.notificationsGateway.sendToUser(notification_data.type, user_id, {
                ...payload,
                action: 'add',
            });
        } else {
            // Send with 'aggregate' action for aggregated notification
            this.notificationsGateway.sendToUser(notification_data.type, user_id, {
                ...payload,
                action: 'aggregate',
                old_notification: aggregation_result.old_notification,
            });
        }
    }

    private normalizeNotificationData(notification_data: BaseNotificationEntity): void {
        switch (notification_data.type) {
            case NotificationType.FOLLOW: {
                const follow_notification = notification_data as FollowNotificationEntity;
                if (!Array.isArray(follow_notification.follower_id)) {
                    follow_notification.follower_id = [follow_notification.follower_id as any];
                }
                break;
            }
            case NotificationType.LIKE: {
                const like_notification = notification_data as LikeNotificationEntity;
                if (!Array.isArray(like_notification.tweet_id)) {
                    like_notification.tweet_id = [like_notification.tweet_id as any];
                }
                if (!Array.isArray(like_notification.liked_by)) {
                    like_notification.liked_by = [like_notification.liked_by as any];
                }
                break;
            }
            case NotificationType.REPOST: {
                const repost_notification = notification_data as RepostNotificationEntity;
                if (!Array.isArray(repost_notification.tweet_id)) {
                    repost_notification.tweet_id = [repost_notification.tweet_id as any];
                }
                if (!Array.isArray(repost_notification.reposted_by)) {
                    repost_notification.reposted_by = [repost_notification.reposted_by as any];
                }
                break;
            }
        }
    }

    private async tryAggregateNotification(
        user_id: string,
        notification_data: BaseNotificationEntity
    ): Promise<{
        aggregated: boolean;
        old_notification?: any;
    }> {
        const one_day_ago = new Date(Date.now() - 24 * 60 * 60 * 1000);

        switch (notification_data.type) {
            case NotificationType.FOLLOW: {
                const follow_notification = notification_data as FollowNotificationEntity;
                const new_follower_id = Array.isArray(follow_notification.follower_id)
                    ? follow_notification.follower_id[0]
                    : follow_notification.follower_id;

                // Find the user document and check for existing FOLLOW notification
                const user_document = await this.notificationModel
                    .findOne({ user: user_id })
                    .lean();

                if (!user_document || !user_document.notifications) {
                    return { aggregated: false };
                }

                const recent_follow_notification_index = user_document.notifications.findIndex(
                    (n: any) =>
                        n.type === NotificationType.FOLLOW && new Date(n.created_at) >= one_day_ago
                );

                if (recent_follow_notification_index === -1) {
                    return { aggregated: false };
                }

                const old_notification = user_document.notifications[
                    recent_follow_notification_index
                ] as any;

                // Update the specific notification
                const result = await this.notificationModel.updateOne(
                    {
                        user: user_id,
                    },
                    {
                        $addToSet: {
                            'notifications.$[elem].follower_id': new_follower_id,
                        },
                        $set: {
                            'notifications.$[elem].created_at': new Date(),
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                'elem.type': NotificationType.FOLLOW,
                                'elem.created_at': { $gte: one_day_ago },
                            },
                        ],
                    }
                );

                return {
                    aggregated: result.matchedCount > 0,
                    old_notification: {
                        type: old_notification.type,
                        created_at: old_notification.created_at,
                        follower_id: old_notification.follower_id,
                    },
                };
            }

            case NotificationType.LIKE: {
                const like_notification = notification_data as LikeNotificationEntity;
                const new_tweet_id = Array.isArray(like_notification.tweet_id)
                    ? like_notification.tweet_id[0]
                    : like_notification.tweet_id;
                const new_liked_by = Array.isArray(like_notification.liked_by)
                    ? like_notification.liked_by[0]
                    : like_notification.liked_by;

                // Find the user document and check for existing LIKE notification
                const user_document = await this.notificationModel
                    .findOne({ user: user_id })
                    .lean();

                if (!user_document || !user_document.notifications) {
                    return { aggregated: false };
                }

                // First, try to find aggregation by TWEET (multiple people liking the same tweet)
                const matching_by_tweet_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.LIKE) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    // Check if this notification is for the same tweet
                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    return tweet_id_array.includes(new_tweet_id) && tweet_id_array.length === 1;
                });

                // Second, try to find aggregation by PERSON (same person liking multiple tweets)
                const matching_by_person_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.LIKE) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    // Check if this notification contains a like from the same person
                    const liked_by_array = Array.isArray(n.liked_by) ? n.liked_by : [n.liked_by];
                    return liked_by_array.includes(new_liked_by) && liked_by_array.length === 1;
                });

                let aggregation_type: 'tweet' | 'person' | null = null;
                let matching_index = -1;

                // Prioritize aggregation by tweet if found
                if (matching_by_tweet_index !== -1) {
                    aggregation_type = 'tweet';
                    matching_index = matching_by_tweet_index;
                } else if (matching_by_person_index !== -1) {
                    aggregation_type = 'person';
                    matching_index = matching_by_person_index;
                } else {
                    return { aggregated: false };
                }

                const old_notification = user_document.notifications[matching_index] as any;

                // Update based on aggregation type
                let result;
                if (aggregation_type === 'tweet') {
                    // Add the new person to the existing notification for this tweet
                    result = await this.notificationModel.updateOne(
                        { user: user_id },
                        {
                            $addToSet: {
                                'notifications.$[elem].liked_by': new_liked_by,
                            },
                            $set: {
                                'notifications.$[elem].created_at': new Date(),
                            },
                        },
                        {
                            arrayFilters: [
                                {
                                    'elem.type': NotificationType.LIKE,
                                    'elem.tweet_id': new_tweet_id,
                                    'elem.created_at': { $gte: one_day_ago },
                                },
                            ],
                        }
                    );
                } else {
                    // Add the new tweet to the existing notification for this person
                    result = await this.notificationModel.updateOne(
                        { user: user_id },
                        {
                            $addToSet: {
                                'notifications.$[elem].tweet_id': new_tweet_id,
                            },
                            $set: {
                                'notifications.$[elem].created_at': new Date(),
                            },
                        },
                        {
                            arrayFilters: [
                                {
                                    'elem.type': NotificationType.LIKE,
                                    'elem.liked_by': new_liked_by,
                                    'elem.created_at': { $gte: one_day_ago },
                                },
                            ],
                        }
                    );
                }

                return {
                    aggregated: result.matchedCount > 0,
                    old_notification: {
                        type: old_notification.type,
                        created_at: old_notification.created_at,
                        tweet_id: old_notification.tweet_id,
                        liked_by: old_notification.liked_by,
                    },
                };
            }

            case NotificationType.REPOST: {
                const repost_notification = notification_data as RepostNotificationEntity;
                const new_tweet_id = Array.isArray(repost_notification.tweet_id)
                    ? repost_notification.tweet_id[0]
                    : repost_notification.tweet_id;
                const new_reposted_by = Array.isArray(repost_notification.reposted_by)
                    ? repost_notification.reposted_by[0]
                    : repost_notification.reposted_by;

                // Find the user document and check for existing REPOST notification
                const user_document = await this.notificationModel
                    .findOne({ user: user_id })
                    .lean();

                if (!user_document || !user_document.notifications) {
                    return { aggregated: false };
                }

                // First, try to find aggregation by TWEET (multiple people reposting the same tweet)
                const matching_by_tweet_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.REPOST) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    // Check if this notification is for the same tweet
                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    return tweet_id_array.includes(new_tweet_id) && tweet_id_array.length === 1;
                });

                // Second, try to find aggregation by PERSON (same person reposting multiple tweets)
                const matching_by_person_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.REPOST) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    // Check if this notification contains a repost from the same person
                    const reposted_by_array = Array.isArray(n.reposted_by)
                        ? n.reposted_by
                        : [n.reposted_by];
                    return (
                        reposted_by_array.includes(new_reposted_by) &&
                        reposted_by_array.length === 1
                    );
                });

                let aggregation_type: 'tweet' | 'person' | null = null;
                let matching_index = -1;

                // Prioritize aggregation by tweet if found
                if (matching_by_tweet_index !== -1) {
                    aggregation_type = 'tweet';
                    matching_index = matching_by_tweet_index;
                } else if (matching_by_person_index !== -1) {
                    aggregation_type = 'person';
                    matching_index = matching_by_person_index;
                } else {
                    return { aggregated: false };
                }

                const old_notification = user_document.notifications[matching_index] as any;

                // Update based on aggregation type
                let result;
                if (aggregation_type === 'tweet') {
                    // Add the new person to the existing notification for this tweet
                    result = await this.notificationModel.updateOne(
                        { user: user_id },
                        {
                            $addToSet: {
                                'notifications.$[elem].reposted_by': new_reposted_by,
                            },
                            $set: {
                                'notifications.$[elem].created_at': new Date(),
                            },
                        },
                        {
                            arrayFilters: [
                                {
                                    'elem.type': NotificationType.REPOST,
                                    'elem.tweet_id': new_tweet_id,
                                    'elem.created_at': { $gte: one_day_ago },
                                },
                            ],
                        }
                    );
                } else {
                    // Add the new tweet to the existing notification for this person
                    result = await this.notificationModel.updateOne(
                        { user: user_id },
                        {
                            $addToSet: {
                                'notifications.$[elem].tweet_id': new_tweet_id,
                            },
                            $set: {
                                'notifications.$[elem].created_at': new Date(),
                            },
                        },
                        {
                            arrayFilters: [
                                {
                                    'elem.type': NotificationType.REPOST,
                                    'elem.reposted_by': new_reposted_by,
                                    'elem.created_at': { $gte: one_day_ago },
                                },
                            ],
                        }
                    );
                }

                return {
                    aggregated: result.matchedCount > 0,
                    old_notification: {
                        type: old_notification.type,
                        created_at: old_notification.created_at,
                        tweet_id: old_notification.tweet_id,
                        reposted_by: old_notification.reposted_by,
                    },
                };
            }

            default:
                // Quote and Reply notifications are not aggregated
                return { aggregated: false };
        }
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
                    if (follow_notification.follower_id) {
                        if (Array.isArray(follow_notification.follower_id)) {
                            follow_notification.follower_id.forEach((id) => user_ids.add(id));
                        } else {
                            user_ids.add(follow_notification.follower_id as any);
                        }
                    }
                    break;
                }
                case NotificationType.LIKE: {
                    const like_notification = notification as LikeNotificationEntity;
                    if (like_notification.liked_by) {
                        if (Array.isArray(like_notification.liked_by)) {
                            like_notification.liked_by.forEach((id) => user_ids.add(id));
                        } else {
                            user_ids.add(like_notification.liked_by as any);
                        }
                    }
                    if (like_notification.tweet_id) {
                        // Collect ALL tweet IDs for aggregated notifications
                        if (Array.isArray(like_notification.tweet_id)) {
                            like_notification.tweet_id.forEach((id) => tweet_ids.add(id));
                        } else {
                            tweet_ids.add(like_notification.tweet_id as any);
                        }
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
                        if (Array.isArray(repost_notification.reposted_by)) {
                            repost_notification.reposted_by.forEach((id) => user_ids.add(id));
                        } else {
                            user_ids.add(repost_notification.reposted_by as any);
                        }
                    }
                    if (repost_notification.tweet_id) {
                        // Collect ALL tweet IDs for aggregated notifications
                        if (Array.isArray(repost_notification.tweet_id)) {
                            repost_notification.tweet_id.forEach((id) => tweet_ids.add(id));
                        } else {
                            tweet_ids.add(repost_notification.tweet_id as any);
                        }
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

        const missing_tweet_ids = new Set<string>();

        const response_notifications: NotificationDto[] = user_notifications.notifications
            .map((notification: any) => {
                switch (notification.type) {
                    case NotificationType.FOLLOW: {
                        const follow_notification = notification as FollowNotificationEntity;
                        if (!follow_notification.follower_id) {
                            return null;
                        }

                        const follower_ids = Array.isArray(follow_notification.follower_id)
                            ? follow_notification.follower_id
                            : [follow_notification.follower_id as any];

                        const followers = follower_ids
                            .map((id) => user_map.get(id))
                            .filter((user): user is User => user !== undefined);

                        if (followers.length === 0) {
                            return null;
                        }
                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            followers,
                        };
                    }
                    case NotificationType.LIKE: {
                        const like_notification = notification as LikeNotificationEntity;

                        // Skip notifications with missing tweet_id
                        if (
                            !like_notification.tweet_id ||
                            like_notification.tweet_id.length === 0
                        ) {
                            return null;
                        }

                        // Get ALL tweet IDs as an array
                        const tweet_ids_array = Array.isArray(like_notification.tweet_id)
                            ? like_notification.tweet_id
                            : [like_notification.tweet_id as any];

                        // Map all tweet IDs to tweet objects
                        const tweets = tweet_ids_array
                            .map((id) => tweet_map.get(id))
                            .filter((tweet): tweet is Tweet => tweet !== undefined);

                        if (tweets.length === 0) {
                            tweet_ids_array.forEach((id) => missing_tweet_ids.add(id));
                            return null;
                        }

                        if (
                            !like_notification.liked_by ||
                            like_notification.liked_by.length === 0
                        ) {
                            return null;
                        }

                        const liked_by_ids = Array.isArray(like_notification.liked_by)
                            ? like_notification.liked_by
                            : [like_notification.liked_by as any];

                        const likers = liked_by_ids
                            .map((id) => user_map.get(id))
                            .filter((user): user is User => user !== undefined);

                        if (likers.length === 0) {
                            return null;
                        }

                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            likers,
                            tweets,
                        };
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
                        // Nest parent_tweet inside quote_tweet
                        const quote_tweet_with_parent = {
                            ...quote_tweet,
                            parent_tweet,
                        };
                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            quoter,
                            quote_tweet: quote_tweet_with_parent,
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

                        // Skip notifications with missing tweet_id
                        if (
                            !repost_notification.tweet_id ||
                            repost_notification.tweet_id.length === 0
                        ) {
                            return null;
                        }

                        // Get ALL tweet IDs as an array
                        const tweet_ids_array = Array.isArray(repost_notification.tweet_id)
                            ? repost_notification.tweet_id
                            : [repost_notification.tweet_id as any];

                        // Map all tweet IDs to tweet objects
                        const tweets = tweet_ids_array
                            .map((id) => tweet_map.get(id))
                            .filter((tweet): tweet is Tweet => tweet !== undefined);

                        if (tweets.length === 0) {
                            tweet_ids_array.forEach((id) => missing_tweet_ids.add(id));
                            return null;
                        }

                        if (
                            !repost_notification.reposted_by ||
                            repost_notification.reposted_by.length === 0
                        ) {
                            return null;
                        }

                        const reposted_by_ids = Array.isArray(repost_notification.reposted_by)
                            ? repost_notification.reposted_by
                            : [repost_notification.reposted_by as any];

                        const reposters = reposted_by_ids
                            .map((id) => user_map.get(id))
                            .filter((user): user is User => user !== undefined);

                        if (reposters.length === 0) {
                            return null;
                        }

                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            reposters,
                            tweets,
                        };
                    }
                    default:
                        return null;
                }
            })
            .filter((notification): notification is NotificationDto => notification !== null);

        // Deduplicate notifications: merge those with same type, same people, and same tweet
        const deduplicated_notifications = this.deduplicateNotifications(response_notifications);

        // Clean up notifications with missing tweets
        if (missing_tweet_ids.size > 0) {
            await this.clear_jobs_service.queueClearNotification({
                user_id,
                tweet_ids: Array.from(missing_tweet_ids),
            });
        }

        return deduplicated_notifications;
    }

    private deduplicateNotifications(notifications: NotificationDto[]): NotificationDto[] {
        const map = new Map<string, NotificationDto>();

        for (const notification of notifications) {
            let key: string;

            switch (notification.type) {
                case NotificationType.LIKE: {
                    const like_notification = notification as any;
                    // Create key based on type + sorted user IDs + sorted tweet IDs
                    const user_ids =
                        like_notification.likers
                            ?.map((u: any) => u.id)
                            .sort()
                            .join(',') || '';
                    const tweet_ids =
                        like_notification.tweets
                            ?.map((t: any) => t.tweet_id)
                            .sort()
                            .join(',') || '';
                    key = `like:${user_ids}:${tweet_ids}`;

                    if (map.has(key)) {
                        // Keep the one with the most recent created_at
                        const existing = map.get(key)!;
                        if (new Date(notification.created_at) > new Date(existing.created_at)) {
                            map.set(key, notification);
                        }
                    } else {
                        map.set(key, notification);
                    }
                    break;
                }
                case NotificationType.REPOST: {
                    const repost_notification = notification as any;
                    // Create key based on type + sorted user IDs + sorted tweet IDs
                    const user_ids =
                        repost_notification.reposters
                            ?.map((u: any) => u.id)
                            .sort()
                            .join(',') || '';
                    const tweet_ids =
                        repost_notification.tweets
                            ?.map((t: any) => t.tweet_id)
                            .sort()
                            .join(',') || '';
                    key = `repost:${user_ids}:${tweet_ids}`;

                    if (map.has(key)) {
                        // Keep the one with the most recent created_at
                        const existing = map.get(key)!;
                        if (new Date(notification.created_at) > new Date(existing.created_at)) {
                            map.set(key, notification);
                        }
                    } else {
                        map.set(key, notification);
                    }
                    break;
                }
                case NotificationType.FOLLOW: {
                    const follow_notification = notification as any;
                    // Create key based on type + sorted user IDs
                    const user_ids =
                        follow_notification.followers
                            ?.map((u: any) => u.id)
                            .sort()
                            .join(',') || '';
                    key = `follow:${user_ids}`;

                    if (map.has(key)) {
                        // Keep the one with the most recent created_at
                        const existing = map.get(key)!;
                        if (new Date(notification.created_at) > new Date(existing.created_at)) {
                            map.set(key, notification);
                        }
                    } else {
                        map.set(key, notification);
                    }
                    break;
                }
                default:
                    // For REPLY and QUOTE, use unique key (no deduplication)
                    key = `${notification.type}:${notification.created_at.toString()}:${Math.random()}`;
                    map.set(key, notification);
                    break;
            }
        }

        return Array.from(map.values());
    }

    async deleteNotificationsByTweetIds(user_id: string, tweet_ids: string[]): Promise<void> {
        try {
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
}
