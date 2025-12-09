import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notifications.entity';
import { BaseNotificationEntity } from './entities/base-notification.entity';
import { NotificationType } from './enums/notification-types';
import { NotificationsGateway } from './notifications.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { In, Repository } from 'typeorm';
import { ReplyNotificationEntity } from './entities/reply-notification.entity';
import { RepostNotificationEntity } from './entities/repost-notification.entity';
import { QuoteNotificationEntity } from './entities/quote-notification.entity';
import { LikeNotificationEntity } from './entities/like-notification.entity';
import { FollowNotificationEntity } from './entities/follow-notification.entity';
import { MentionNotificationEntity } from './entities/mention-notification.entity';
import { NotificationDto } from './dto/notifications-response.dto';
import { BackgroundJobsModule } from 'src/background-jobs';
import { ClearJobService } from 'src/background-jobs/notifications/clear/clear.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
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

    onModuleInit() {
        this.notificationsGateway.setNotificationsService(this);
    }

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
            // If not aggregated, add as new notification and increment newest_count
            await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $push: {
                        notifications: {
                            $each: [notification_data],
                            $sort: { created_at: -1 },
                            $slice: 50,
                        },
                    },
                    $inc: { newest_count: 1 },
                },
                { upsert: true }
            );

            // Send with 'add' action for new notification
            this.notificationsGateway.sendToUser(notification_data.type, user_id, {
                ...payload,
                action: 'add',
            });
        } else {
            // Increment newest_count for aggregated notification
            await this.notificationModel.updateOne(
                { user: user_id },
                { $inc: { newest_count: 1 } }
            );

            // Fetch and populate the aggregated notification with full data
            const aggregated_notification_with_data = await this.fetchNotificationWithData(
                user_id,
                aggregation_result.updated_notification
            );

            // Send with 'aggregate' action for aggregated notification
            this.notificationsGateway.sendToUser(notification_data.type, user_id, {
                ...aggregated_notification_with_data,
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
        updated_notification?: any;
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

                // Update the specific notification and return the updated document
                const updated_doc = await this.notificationModel.findOneAndUpdate(
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
                        new: true,
                        lean: true,
                    }
                );

                if (!updated_doc) {
                    return { aggregated: false };
                }

                // Find the updated notification
                const updated_notification = updated_doc.notifications?.find(
                    (n: any) =>
                        n.type === NotificationType.FOLLOW && new Date(n.created_at) >= one_day_ago
                );

                // If we can't find the updated notification, treat as non-aggregated
                if (!updated_notification) {
                    return { aggregated: false };
                }

                return {
                    aggregated: true,
                    old_notification: {
                        type: old_notification.type,
                        created_at: old_notification.created_at,
                        follower_id: old_notification.follower_id,
                    },
                    updated_notification,
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

                    // Check if this notification is for the same tweet AND only has one tweet (not aggregated by person)
                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    const liked_by_array = Array.isArray(n.liked_by) ? n.liked_by : [n.liked_by];
                    return (
                        tweet_id_array.includes(new_tweet_id) &&
                        tweet_id_array.length === 1 &&
                        liked_by_array.length === 1
                    );
                });

                // Second, try to find aggregation by PERSON (same person liking multiple tweets)
                const matching_by_person_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.LIKE) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    // Check if this notification contains a like from the same person AND only has one person (not aggregated by tweet)
                    const liked_by_array = Array.isArray(n.liked_by) ? n.liked_by : [n.liked_by];
                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    return (
                        liked_by_array.includes(new_liked_by) &&
                        liked_by_array.length === 1 &&
                        tweet_id_array.length === 1
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

                // Update based on aggregation type and return the updated document
                let updated_doc_like;
                if (aggregation_type === 'tweet') {
                    // Add the new person to the existing notification for this tweet
                    updated_doc_like = await this.notificationModel.findOneAndUpdate(
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
                            new: true,
                            lean: true,
                        }
                    );
                } else {
                    // Add the new tweet to the existing notification for this person
                    updated_doc_like = await this.notificationModel.findOneAndUpdate(
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
                            new: true,
                            lean: true,
                        }
                    );
                }

                if (!updated_doc_like) {
                    return { aggregated: false };
                }

                // Find the updated notification
                const updated_notification_like = updated_doc_like.notifications?.find((n: any) => {
                    if (n.type !== NotificationType.LIKE) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;
                    const tweet_ids = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    const liked_by_ids = Array.isArray(n.liked_by) ? n.liked_by : [n.liked_by];
                    return (
                        (aggregation_type === 'tweet' && tweet_ids.includes(new_tweet_id)) ||
                        (aggregation_type === 'person' && liked_by_ids.includes(new_liked_by))
                    );
                });

                // If we can't find the updated notification, treat as non-aggregated
                if (!updated_notification_like) {
                    return { aggregated: false };
                }

                return {
                    aggregated: true,
                    old_notification: {
                        type: old_notification.type,
                        created_at: old_notification.created_at,
                        tweet_id: old_notification.tweet_id,
                        liked_by: old_notification.liked_by,
                    },
                    updated_notification: updated_notification_like,
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

                    // Check if this notification is for the same tweet AND only has one tweet (not aggregated by person)
                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    const reposted_by_array = Array.isArray(n.reposted_by)
                        ? n.reposted_by
                        : [n.reposted_by];
                    return (
                        tweet_id_array.includes(new_tweet_id) &&
                        tweet_id_array.length === 1 &&
                        reposted_by_array.length === 1
                    );
                });

                // Second, try to find aggregation by PERSON (same person reposting multiple tweets)
                const matching_by_person_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.REPOST) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    // Check if this notification contains a repost from the same person AND only has one person (not aggregated by tweet)
                    const reposted_by_array = Array.isArray(n.reposted_by)
                        ? n.reposted_by
                        : [n.reposted_by];
                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    return (
                        reposted_by_array.includes(new_reposted_by) &&
                        reposted_by_array.length === 1 &&
                        tweet_id_array.length === 1
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

                // Update based on aggregation type and return the updated document
                let updated_doc_repost;
                if (aggregation_type === 'tweet') {
                    // Add the new person to the existing notification for this tweet
                    updated_doc_repost = await this.notificationModel.findOneAndUpdate(
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
                            new: true,
                            lean: true,
                        }
                    );
                } else {
                    // Add the new tweet to the existing notification for this person
                    updated_doc_repost = await this.notificationModel.findOneAndUpdate(
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
                            new: true,
                            lean: true,
                        }
                    );
                }

                if (!updated_doc_repost) {
                    return { aggregated: false };
                }

                // Find the updated notification
                const updated_notification_repost = updated_doc_repost.notifications?.find(
                    (n: any) => {
                        if (n.type !== NotificationType.REPOST) return false;
                        if (new Date(n.created_at) < one_day_ago) return false;
                        const tweet_ids = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                        const reposted_by_ids = Array.isArray(n.reposted_by)
                            ? n.reposted_by
                            : [n.reposted_by];
                        return (
                            (aggregation_type === 'tweet' && tweet_ids.includes(new_tweet_id)) ||
                            (aggregation_type === 'person' &&
                                reposted_by_ids.includes(new_reposted_by))
                        );
                    }
                );

                // If we can't find the updated notification, treat as non-aggregated
                if (!updated_notification_repost) {
                    return { aggregated: false };
                }

                return {
                    aggregated: true,
                    old_notification: {
                        type: old_notification.type,
                        created_at: old_notification.created_at,
                        tweet_id: old_notification.tweet_id,
                        reposted_by: old_notification.reposted_by,
                    },
                    updated_notification: updated_notification_repost,
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

    async getUserNotifications(
        user_id: string,
        page: number = 1
    ): Promise<{
        notifications: NotificationDto[];
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
    }> {
        const page_size = 10;
        const user_notifications = await this.notificationModel
            .findOne({ user: user_id })
            .lean()
            .exec();

        if (
            !user_notifications ||
            !user_notifications.notifications ||
            user_notifications.notifications.length === 0
        ) {
            return {
                notifications: [],
                page,
                page_size,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_previous: false,
            };
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
                case NotificationType.MENTION: {
                    const mention_notification = notification as MentionNotificationEntity;
                    if (mention_notification.mentioned_by) {
                        user_ids.add(mention_notification.mentioned_by);
                    }
                    if (mention_notification.tweet_id) {
                        tweet_ids.add(mention_notification.tweet_id);
                    }
                    if (mention_notification.parent_tweet_id) {
                        tweet_ids.add(mention_notification.parent_tweet_id);
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
        const missing_user_ids = new Set<string>();

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
                            .map((id) => {
                                const user = user_map.get(id);
                                if (!user) {
                                    missing_user_ids.add(id);
                                }
                                return user;
                            })
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
                            .map((id) => {
                                const user = user_map.get(id);
                                if (!user) {
                                    missing_user_ids.add(id);
                                }
                                return user;
                            })
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
                            if (!quoter && quote_notification.quoted_by) {
                                missing_user_ids.add(quote_notification.quoted_by);
                            }
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
                            if (!replier && reply_notification.replied_by) {
                                missing_user_ids.add(reply_notification.replied_by);
                            }
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
                            .map((id) => {
                                const user = user_map.get(id);
                                if (!user) {
                                    missing_user_ids.add(id);
                                }
                                return user;
                            })
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
                    case NotificationType.MENTION: {
                        const mention_notification = notification as MentionNotificationEntity;
                        const mentioner = user_map.get(mention_notification.mentioned_by);
                        const tweet = tweet_map.get(mention_notification.tweet_id);

                        if (!mentioner || !tweet) {
                            if (!mentioner && mention_notification.mentioned_by) {
                                missing_user_ids.add(mention_notification.mentioned_by);
                            }
                            if (!tweet && mention_notification.tweet_id) {
                                missing_tweet_ids.add(mention_notification.tweet_id);
                            }
                            return null;
                        }

                        // For quote tweets, include parent_tweet if available
                        let mention_tweet = tweet;
                        if (
                            mention_notification.tweet_type === 'quote' &&
                            mention_notification.parent_tweet_id
                        ) {
                            const parent_tweet = tweet_map.get(
                                mention_notification.parent_tweet_id
                            );
                            if (parent_tweet) {
                                mention_tweet = {
                                    ...tweet,
                                    parent_tweet,
                                } as any;
                            } else {
                                missing_tweet_ids.add(mention_notification.parent_tweet_id);
                            }
                        }

                        return {
                            type: notification.type,
                            created_at: notification.created_at,
                            mentioner,
                            tweet: mention_tweet,
                            tweet_type: mention_notification.tweet_type,
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

        // Clean up notifications with missing users
        if (missing_user_ids.size > 0) {
            await this.clear_jobs_service.queueClearNotificationByUsers(
                user_id,
                Array.from(missing_user_ids)
            );
        }

        // Apply pagination
        const total = deduplicated_notifications.length;
        const total_pages = Math.ceil(total / page_size);
        const skip = (page - 1) * page_size;
        const paginated_notifications = deduplicated_notifications.slice(skip, skip + page_size);

        return {
            notifications: paginated_notifications,
            page,
            page_size,
            total,
            total_pages,
            has_next: page < total_pages,
            has_previous: page > 1,
        };
    }

    async getMentionsAndReplies(
        user_id: string,
        page: number = 1
    ): Promise<{
        notifications: NotificationDto[];
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
    }> {
        const page_size = 10;

        // Get all notifications from MongoDB
        const user_notifications = await this.notificationModel
            .findOne({ user: user_id })
            .lean()
            .exec();

        if (
            !user_notifications ||
            !user_notifications.notifications ||
            user_notifications.notifications.length === 0
        ) {
            return {
                notifications: [],
                page,
                page_size,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_previous: false,
            };
        }

        // Filter to only include mentions and replies from raw MongoDB data
        const filtered_notifications = user_notifications.notifications.filter(
            (notification: any) =>
                notification.type === NotificationType.MENTION ||
                notification.type === NotificationType.REPLY
        );

        if (filtered_notifications.length === 0) {
            return {
                notifications: [],
                page,
                page_size,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_previous: false,
            };
        }

        // Collect user IDs and tweet IDs from filtered notifications
        const user_ids = new Set<string>();
        const tweet_ids = new Set<string>();

        filtered_notifications.forEach((notification: any) => {
            if (notification.type === NotificationType.MENTION) {
                const mention_notification = notification as MentionNotificationEntity;
                if (mention_notification.mentioned_by) {
                    user_ids.add(mention_notification.mentioned_by);
                }
                if (mention_notification.tweet_id) {
                    tweet_ids.add(mention_notification.tweet_id);
                }
                if (mention_notification.parent_tweet_id) {
                    tweet_ids.add(mention_notification.parent_tweet_id);
                }
            } else if (notification.type === NotificationType.REPLY) {
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
            }
        });

        // Fetch all required data in parallel
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

        // Process filtered notifications
        const response_notifications: NotificationDto[] = filtered_notifications
            .map((notification: any) => {
                if (notification.type === NotificationType.MENTION) {
                    const mention_notification = notification as MentionNotificationEntity;
                    const mentioner = user_map.get(mention_notification.mentioned_by);
                    const tweet = tweet_map.get(mention_notification.tweet_id);

                    if (!mentioner || !tweet) {
                        if (!tweet && mention_notification.tweet_id) {
                            missing_tweet_ids.add(mention_notification.tweet_id);
                        }
                        return null;
                    }

                    // For quote tweets, include parent_tweet if available
                    let mention_tweet = tweet;
                    if (
                        mention_notification.tweet_type === 'quote' &&
                        mention_notification.parent_tweet_id
                    ) {
                        const parent_tweet = tweet_map.get(mention_notification.parent_tweet_id);
                        if (parent_tweet) {
                            mention_tweet = {
                                ...tweet,
                                parent_tweet,
                            } as any;
                        } else {
                            missing_tweet_ids.add(mention_notification.parent_tweet_id);
                        }
                    }

                    return {
                        type: notification.type,
                        created_at: notification.created_at,
                        mentioner,
                        tweet: mention_tweet,
                        tweet_type: mention_notification.tweet_type,
                    };
                } else if (notification.type === NotificationType.REPLY) {
                    const reply_notification = notification as ReplyNotificationEntity;
                    const replier = user_map.get(reply_notification.replied_by);
                    const reply_tweet = reply_notification.reply_tweet_id
                        ? tweet_map.get(reply_notification.reply_tweet_id)
                        : null;
                    const original_tweet = tweet_map.get(reply_notification.original_tweet_id);

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
                return null;
            })
            .filter((notification): notification is NotificationDto => notification !== null);

        // Clean up notifications with missing tweets
        if (missing_tweet_ids.size > 0) {
            await this.clear_jobs_service.queueClearNotification({
                user_id,
                tweet_ids: Array.from(missing_tweet_ids),
            });
        }

        // Apply pagination
        const total = response_notifications.length;
        const total_pages = Math.ceil(total / page_size);
        const skip = (page - 1) * page_size;
        const paginated_notifications = response_notifications.slice(skip, skip + page_size);

        return {
            notifications: paginated_notifications,
            page,
            page_size,
            total,
            total_pages,
            has_next: page < total_pages,
            has_previous: page > 1,
        };
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

    async cleanupNotificationsByUserIds(
        user_id: string,
        missing_user_ids: string[]
    ): Promise<void> {
        try {
            // Remove user IDs from arrays in aggregated notifications (FOLLOW, LIKE, REPOST)
            for (const missing_user_id of missing_user_ids) {
                // Remove from follower_id arrays in FOLLOW notifications
                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[].follower_id': missing_user_id,
                        },
                    }
                );

                // Remove from liked_by arrays in LIKE notifications
                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[].liked_by': missing_user_id,
                        },
                    }
                );

                // Remove from reposted_by arrays in REPOST notifications
                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[].reposted_by': missing_user_id,
                        },
                    }
                );

                // Remove entire notifications where the user is the primary actor (QUOTE, REPLY, MENTION)
                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            notifications: {
                                $or: [
                                    { quoted_by: missing_user_id },
                                    { replied_by: missing_user_id },
                                    { mentioned_by: missing_user_id },
                                ],
                            },
                        },
                    }
                );
            }

            // Clean up notifications with empty arrays (FOLLOW, LIKE, REPOST)
            await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        notifications: {
                            $or: [
                                { type: NotificationType.FOLLOW, follower_id: { $size: 0 } },
                                { type: NotificationType.LIKE, liked_by: { $size: 0 } },
                                { type: NotificationType.REPOST, reposted_by: { $size: 0 } },
                            ],
                        },
                    },
                }
            );
        } catch (error) {
            console.error('Error cleaning up notifications by user IDs:', error);
            throw error;
        }
    }

    async removeFollowNotification(user_id: string, follower_id: string): Promise<boolean> {
        try {
            // Calculate the date 1 day ago
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);
            const now = new Date();

            // First, try to remove the follower from an aggregated notification
            const result = await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        'notifications.$[elem].follower_id': follower_id,
                    },
                    $set: {
                        'notifications.$[elem].created_at': now,
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

            // Then, remove any follow notifications with empty follower_id arrays
            const cleanup_result = await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        notifications: {
                            type: NotificationType.FOLLOW,
                            follower_id: { $size: 0 },
                            created_at: { $gte: one_day_ago },
                        },
                    },
                }
            );

            // Return true if any modification was made
            return result.modifiedCount > 0 || cleanup_result.modifiedCount > 0;
        } catch (error) {
            console.error('Error removing follow notification:', error);
            throw error;
        }
    }

    async removeLikeNotification(
        user_id: string,
        tweet_id: string,
        liked_by: string
    ): Promise<boolean> {
        try {
            // Calculate the date 1 day ago
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);
            const now = new Date();

            // First, check for aggregated notifications
            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();

            if (!user_document || !user_document.notifications) {
                return false;
            }

            // Find the notification that contains the like
            const notification_index = user_document.notifications.findIndex((n: any) => {
                if (n.type !== NotificationType.LIKE) return false;
                if (new Date(n.created_at) < one_day_ago) return false;

                const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                const liked_by_array = Array.isArray(n.liked_by) ? n.liked_by : [n.liked_by];

                return tweet_id_array.includes(tweet_id) && liked_by_array.includes(liked_by);
            });

            if (notification_index === -1) {
                return false;
            }

            const notification = user_document.notifications[notification_index] as any;
            const tweet_id_array = Array.isArray(notification.tweet_id)
                ? notification.tweet_id
                : [notification.tweet_id];
            const liked_by_array = Array.isArray(notification.liked_by)
                ? notification.liked_by
                : [notification.liked_by];

            // Determine if this is aggregated by tweet or by person
            const is_single_tweet = tweet_id_array.length === 1;
            const is_single_person = liked_by_array.length === 1;
            let modified = false;

            if (is_single_tweet && is_single_person) {
                // Not aggregated
                const result = await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            notifications: {
                                type: NotificationType.LIKE,
                                tweet_id: tweet_id,
                                liked_by: liked_by,
                                created_at: { $gte: one_day_ago },
                            },
                        },
                    }
                );
                modified = result.modifiedCount > 0;
            } else if (is_single_tweet) {
                // Aggregated by tweet, remove the person
                const result = await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[elem].liked_by': liked_by,
                        },
                        $set: {
                            'notifications.$[elem].created_at': now,
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                'elem.type': NotificationType.LIKE,
                                'elem.tweet_id': tweet_id,
                                'elem.created_at': { $gte: one_day_ago },
                            },
                        ],
                    }
                );
                modified = result.modifiedCount > 0;
            } else if (is_single_person) {
                // Aggregated by person, remove the tweet
                const result = await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[elem].tweet_id': tweet_id,
                        },
                        $set: {
                            'notifications.$[elem].created_at': now,
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                'elem.type': NotificationType.LIKE,
                                'elem.liked_by': liked_by,
                                'elem.created_at': { $gte: one_day_ago },
                            },
                        ],
                    }
                );
                modified = result.modifiedCount > 0;
            }

            // Clean up notifications with empty arrays
            const cleanup_result = await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        notifications: {
                            type: NotificationType.LIKE,
                            created_at: { $gte: one_day_ago },
                            $or: [{ tweet_id: { $size: 0 } }, { liked_by: { $size: 0 } }],
                        },
                    },
                }
            );

            return modified || cleanup_result.modifiedCount > 0;
        } catch (error) {
            console.error('Error removing like notification:', error);
            throw error;
        }
    }

    async removeRepostNotification(
        user_id: string,
        tweet_id: string,
        reposted_by: string
    ): Promise<boolean> {
        try {
            // Calculate the date 1 day ago
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);
            const now = new Date();

            // First, check for aggregated notifications
            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();

            if (!user_document || !user_document.notifications) {
                return false;
            }

            // Find the notification that contains the repost
            const notification_index = user_document.notifications.findIndex((n: any) => {
                if (n.type !== NotificationType.REPOST) return false;
                if (new Date(n.created_at) < one_day_ago) return false;

                const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                const reposted_by_array = Array.isArray(n.reposted_by)
                    ? n.reposted_by
                    : [n.reposted_by];

                return tweet_id_array.includes(tweet_id) && reposted_by_array.includes(reposted_by);
            });

            if (notification_index === -1) {
                return false;
            }

            const notification = user_document.notifications[notification_index] as any;
            const tweet_id_array = Array.isArray(notification.tweet_id)
                ? notification.tweet_id
                : [notification.tweet_id];
            const reposted_by_array = Array.isArray(notification.reposted_by)
                ? notification.reposted_by
                : [notification.reposted_by];

            // Determine if this is aggregated by tweet or by person
            const is_single_tweet = tweet_id_array.length === 1;
            const is_single_person = reposted_by_array.length === 1;
            let modified = false;

            if (is_single_tweet && is_single_person) {
                // Not aggregated
                const result = await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            notifications: {
                                type: NotificationType.REPOST,
                                tweet_id: tweet_id,
                                reposted_by: reposted_by,
                                created_at: { $gte: one_day_ago },
                            },
                        },
                    }
                );
                modified = result.modifiedCount > 0;
            } else if (is_single_tweet) {
                // Aggregated by tweet, remove the person
                const result = await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[elem].reposted_by': reposted_by,
                        },
                        $set: {
                            'notifications.$[elem].created_at': now,
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                'elem.type': NotificationType.REPOST,
                                'elem.tweet_id': tweet_id,
                                'elem.created_at': { $gte: one_day_ago },
                            },
                        ],
                    }
                );
                modified = result.modifiedCount > 0;
            } else if (is_single_person) {
                // Aggregated by person, remove the tweet
                const result = await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[elem].tweet_id': tweet_id,
                        },
                        $set: {
                            'notifications.$[elem].created_at': now,
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                'elem.type': NotificationType.REPOST,
                                'elem.reposted_by': reposted_by,
                                'elem.created_at': { $gte: one_day_ago },
                            },
                        ],
                    }
                );
                modified = result.modifiedCount > 0;
            }

            // Clean up notifications with empty arrays
            const cleanup_result = await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        notifications: {
                            type: NotificationType.REPOST,
                            created_at: { $gte: one_day_ago },
                            $or: [{ tweet_id: { $size: 0 } }, { reposted_by: { $size: 0 } }],
                        },
                    },
                }
            );

            return modified || cleanup_result.modifiedCount > 0;
        } catch (error) {
            console.error('Error removing repost notification:', error);
            throw error;
        }
    }

    async removeReplyNotification(
        user_id: string,
        reply_tweet_id: string,
        replied_by: string
    ): Promise<boolean> {
        try {
            // Calculate the date 1 day ago
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);

            const result = await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        notifications: {
                            type: NotificationType.REPLY,
                            reply_tweet_id: reply_tweet_id,
                            replied_by: replied_by,
                            created_at: { $gte: one_day_ago },
                        },
                    },
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error removing reply notification:', error);
            throw error;
        }
    }

    async removeQuoteNotification(
        user_id: string,
        quote_tweet_id: string,
        quoted_by: string
    ): Promise<boolean> {
        try {
            // Calculate the date 1 day ago
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);

            const result = await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        notifications: {
                            type: NotificationType.QUOTE,
                            quote_tweet_id: quote_tweet_id,
                            quoted_by: quoted_by,
                            created_at: { $gte: one_day_ago },
                        },
                    },
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error removing quote notification:', error);
            throw error;
        }
    }

    async removeMentionNotification(
        user_id: string,
        tweet_id: string,
        mentioned_by: string
    ): Promise<boolean> {
        try {
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);

            const result = await this.notificationModel.updateOne(
                { user: user_id },
                {
                    $pull: {
                        notifications: {
                            type: NotificationType.MENTION,
                            tweet_id: tweet_id,
                            mentioned_by: mentioned_by,
                            created_at: { $gte: one_day_ago },
                        },
                    },
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error removing mention notification:', error);
            throw error;
        }
    }

    private async fetchNotificationWithData(
        owner_user_id: string,
        notification: any
    ): Promise<any> {
        if (!notification) return null;

        const user_ids = new Set<string>();
        const tweet_ids = new Set<string>();

        // Collect user IDs and tweet IDs based on notification type
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
                    if (Array.isArray(like_notification.tweet_id)) {
                        like_notification.tweet_id.forEach((id) => tweet_ids.add(id));
                    } else {
                        tweet_ids.add(like_notification.tweet_id as any);
                    }
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
                    if (Array.isArray(repost_notification.tweet_id)) {
                        repost_notification.tweet_id.forEach((id) => tweet_ids.add(id));
                    } else {
                        tweet_ids.add(repost_notification.tweet_id as any);
                    }
                }
                break;
            }
        }

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
        const missing_user_ids = new Set<string>();

        // Build the notification DTO based on type
        switch (notification.type) {
            case NotificationType.FOLLOW: {
                const follow_notification = notification as FollowNotificationEntity;
                const follower_ids = Array.isArray(follow_notification.follower_id)
                    ? follow_notification.follower_id
                    : [follow_notification.follower_id as any];

                const followers = follower_ids
                    .map((id) => {
                        const user = user_map.get(id);
                        if (!user) {
                            missing_user_ids.add(id);
                        }
                        return user;
                    })
                    .filter((user): user is User => user !== undefined);

                // Clean up missing user IDs if any
                if (missing_user_ids.size > 0) {
                    await this.clear_jobs_service.queueClearNotificationByUsers(
                        owner_user_id,
                        Array.from(missing_user_ids)
                    );
                }

                return {
                    type: notification.type,
                    created_at: notification.created_at,
                    followers,
                };
            }
            case NotificationType.LIKE: {
                const like_notification = notification as LikeNotificationEntity;
                const tweet_ids_array = Array.isArray(like_notification.tweet_id)
                    ? like_notification.tweet_id
                    : [like_notification.tweet_id as any];

                const tweets_data = tweet_ids_array
                    .map((id) => {
                        const tweet = tweet_map.get(id);
                        if (!tweet) {
                            missing_tweet_ids.add(id);
                        }
                        return tweet;
                    })
                    .filter((tweet): tweet is Tweet => tweet !== undefined);

                const liked_by_ids = Array.isArray(like_notification.liked_by)
                    ? like_notification.liked_by
                    : [like_notification.liked_by as any];

                const likers = liked_by_ids
                    .map((id) => {
                        const user = user_map.get(id);
                        if (!user) {
                            missing_user_ids.add(id);
                        }
                        return user;
                    })
                    .filter((user): user is User => user !== undefined);

                // Clean up missing tweet IDs if any
                if (missing_tweet_ids.size > 0) {
                    await this.clear_jobs_service.queueClearNotification({
                        user_id: owner_user_id,
                        tweet_ids: Array.from(missing_tweet_ids),
                    });
                }

                // Clean up missing user IDs if any
                if (missing_user_ids.size > 0) {
                    await this.clear_jobs_service.queueClearNotificationByUsers(
                        owner_user_id,
                        Array.from(missing_user_ids)
                    );
                }

                return {
                    type: notification.type,
                    created_at: notification.created_at,
                    likers,
                    tweets: tweets_data,
                };
            }
            case NotificationType.REPOST: {
                const repost_notification = notification as RepostNotificationEntity;
                const tweet_ids_array = Array.isArray(repost_notification.tweet_id)
                    ? repost_notification.tweet_id
                    : [repost_notification.tweet_id as any];

                const tweets_data = tweet_ids_array
                    .map((id) => {
                        const tweet = tweet_map.get(id);
                        if (!tweet) {
                            missing_tweet_ids.add(id);
                        }
                        return tweet;
                    })
                    .filter((tweet): tweet is Tweet => tweet !== undefined);

                const reposted_by_ids = Array.isArray(repost_notification.reposted_by)
                    ? repost_notification.reposted_by
                    : [repost_notification.reposted_by as any];

                const reposters = reposted_by_ids
                    .map((id) => {
                        const user = user_map.get(id);
                        if (!user) {
                            missing_user_ids.add(id);
                        }
                        return user;
                    })
                    .filter((user): user is User => user !== undefined);

                // Clean up missing tweet IDs if any
                if (missing_tweet_ids.size > 0) {
                    await this.clear_jobs_service.queueClearNotification({
                        user_id: owner_user_id,
                        tweet_ids: Array.from(missing_tweet_ids),
                    });
                }

                // Clean up missing user IDs if any
                if (missing_user_ids.size > 0) {
                    await this.clear_jobs_service.queueClearNotificationByUsers(
                        owner_user_id,
                        Array.from(missing_user_ids)
                    );
                }

                return {
                    type: notification.type,
                    created_at: notification.created_at,
                    reposters,
                    tweets: tweets_data,
                };
            }
            default:
                return null;
        }
    }

    async clearNewestCount(user_id: string): Promise<void> {
        try {
            await this.notificationModel.updateOne(
                { user: user_id },
                { $set: { newest_count: 0 } }
            );
        } catch (error) {
            console.error('Error clearing newest_count:', error);
            throw error;
        }
    }

    async getNewestCount(user_id: string): Promise<number> {
        try {
            const user_notifications = await this.notificationModel
                .findOne({ user: user_id })
                .select('newest_count')
                .lean();

            return user_notifications?.newest_count || 0;
        } catch (error) {
            console.error('Error getting newest_count:', error);
            throw error;
        }
    }
}
