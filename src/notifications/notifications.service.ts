import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './entities/notifications.entity';
import { BaseNotificationEntity } from './entities/base-notification.entity';
import { NotificationType } from './enums/notification-types';
import { NotificationsGateway } from './notifications.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';
import { TweetLike } from 'src/tweets/entities/tweet-like.entity';
import { TweetRepost } from 'src/tweets/entities/tweet-repost.entity';
import { TweetBookmark } from 'src/tweets/entities/tweet-bookmark.entity';
import { UserFollows } from 'src/user/entities/user-follows.entity';
import { UserBlocks } from 'src/user/entities/user-blocks.entity';
import { UserMutes } from 'src/user/entities/user-mutes.entity';
import { Message } from 'src/messages/entities/message.entity';
import { In, Repository } from 'typeorm';
import { ReplyNotificationEntity } from './entities/reply-notification.entity';
import { RepostNotificationEntity } from './entities/repost-notification.entity';
import { QuoteNotificationEntity } from './entities/quote-notification.entity';
import { LikeNotificationEntity } from './entities/like-notification.entity';
import { FollowNotificationEntity } from './entities/follow-notification.entity';
import { MentionNotificationEntity } from './entities/mention-notification.entity';
import { MessageNotificationEntity } from './entities/message-notification.entity';
import { NotificationDto } from './dto/notifications-response.dto';
import { BackgroundJobsModule } from 'src/background-jobs';
import { ClearJobService } from 'src/background-jobs/notifications/clear/clear.service';
import { FCMService } from 'src/expo/expo.service';
import { MessagesGateway } from 'src/messages/messages.gateway';
import { plainToInstance } from 'class-transformer';
import { TweetResponseDTO } from 'src/tweets/dto/tweet-response.dto';
import { UserResponseDTO } from 'src/tweets/dto/user-response.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
    constructor(
        @InjectModel(Notification.name)
        private readonly notificationModel: Model<Notification>,
        private readonly notificationsGateway: NotificationsGateway,
        @InjectRepository(User)
        private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        private readonly clear_jobs_service: ClearJobService,
        @Inject(forwardRef(() => FCMService))
        private readonly fcmService: FCMService,
        @Inject(forwardRef(() => MessagesGateway))
        private readonly messagesGateway: MessagesGateway
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
        if (!notification_data._id) notification_data._id = new Types.ObjectId();

        this.normalizeNotificationData(notification_data);

        const aggregation_result = await this.tryAggregateNotification(user_id, notification_data);

        if (!aggregation_result.aggregated) {
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

            const enriched_payload = { ...payload };

            let is_blocked = false;

            if (
                notification_data.type === NotificationType.REPLY ||
                notification_data.type === NotificationType.MENTION ||
                notification_data.type === NotificationType.QUOTE
            ) {
                const tweet_ids = new Set<string>();
                const tweet_ids_needing_interactions = new Set<string>();
                let actor_id: string | undefined;

                if (notification_data.type === NotificationType.REPLY) {
                    const n = notification_data as ReplyNotificationEntity;
                    if (n.reply_tweet_id) {
                        tweet_ids.add(n.reply_tweet_id);
                        tweet_ids_needing_interactions.add(n.reply_tweet_id);
                    }
                    if (n.original_tweet_id) tweet_ids.add(n.original_tweet_id);
                    actor_id = n.replied_by;
                } else if (notification_data.type === NotificationType.MENTION) {
                    const n = notification_data as MentionNotificationEntity;
                    if (n.tweet_id) {
                        tweet_ids.add(n.tweet_id);
                        tweet_ids_needing_interactions.add(n.tweet_id);
                    }
                    if (n.parent_tweet_id) tweet_ids.add(n.parent_tweet_id);
                    actor_id = n.mentioned_by;
                } else if (notification_data.type === NotificationType.QUOTE) {
                    const n = notification_data as QuoteNotificationEntity;
                    if (n.quote_tweet_id) {
                        tweet_ids.add(n.quote_tweet_id);
                        tweet_ids_needing_interactions.add(n.quote_tweet_id);
                    }
                    if (n.parent_tweet_id) tweet_ids.add(n.parent_tweet_id);
                    actor_id = n.quoted_by;
                }

                const tweet_ids_array = Array.from(tweet_ids);
                const ids_needing_interactions = tweet_ids_array.filter((id) =>
                    tweet_ids_needing_interactions.has(id)
                );
                const ids_not_needing_interactions = tweet_ids_array.filter(
                    (id) => !tweet_ids_needing_interactions.has(id)
                );

                const promises: Promise<any>[] = [];
                if (ids_needing_interactions.length > 0) {
                    promises.push(
                        this.getTweetsWithInteractions(ids_needing_interactions, user_id, true)
                    );
                } else {
                    promises.push(Promise.resolve([]));
                }

                if (ids_not_needing_interactions.length > 0) {
                    promises.push(
                        this.getTweetsWithInteractions(ids_not_needing_interactions, user_id, false)
                    );
                } else {
                    promises.push(Promise.resolve([]));
                }

                if (actor_id) {
                    promises.push(this.getUsersWithRelationships([actor_id], user_id, true));
                } else {
                    promises.push(Promise.resolve([]));
                }

                const [tweets_with_interactions, tweets_without_interactions, users] =
                    await Promise.all(promises);
                const tweets = [
                    ...(tweets_with_interactions as Tweet[]),
                    ...(tweets_without_interactions as Tweet[]),
                ];
                const tweet_map = new Map(tweets.map((t) => [t.tweet_id, t]));
                const actor = (users as User[]).length > 0 ? (users as User[])[0] : undefined;

                if (actor) {
                    const enriched_user = this.enrichUserWithStatus(actor);
                    if (enriched_user.is_blocked) {
                        is_blocked = true;
                    }
                    if (notification_data.type === NotificationType.REPLY) {
                        enriched_payload.replier = enriched_user;
                    } else if (notification_data.type === NotificationType.MENTION) {
                        enriched_payload.mentioner = enriched_user;
                    } else if (notification_data.type === NotificationType.QUOTE) {
                        enriched_payload.quoter = enriched_user;
                    }
                }

                if (tweet_ids.size > 0) {
                    if (notification_data.type === NotificationType.REPLY) {
                        const n = notification_data as ReplyNotificationEntity;
                        if (n.reply_tweet_id && tweet_map.has(n.reply_tweet_id)) {
                            enriched_payload.reply_tweet = this.enrichTweetWithStatus(
                                tweet_map.get(n.reply_tweet_id)!
                            );
                        }
                        if (n.original_tweet_id && tweet_map.has(n.original_tweet_id)) {
                            enriched_payload.original_tweet = this.cleanTweet(
                                tweet_map.get(n.original_tweet_id)!
                            );
                        }
                    } else if (notification_data.type === NotificationType.MENTION) {
                        const n = notification_data as MentionNotificationEntity;
                        if (n.tweet_id && tweet_map.has(n.tweet_id)) {
                            let t = tweet_map.get(n.tweet_id)!;
                            if (
                                n.tweet_type === 'quote' &&
                                n.parent_tweet_id &&
                                tweet_map.has(n.parent_tweet_id)
                            ) {
                                t = {
                                    ...t,
                                    parent_tweet: this.cleanTweet(
                                        tweet_map.get(n.parent_tweet_id)!
                                    ),
                                } as any;
                            }
                            enriched_payload.tweet = this.enrichTweetWithStatus(t);
                        }
                    } else if (notification_data.type === NotificationType.QUOTE) {
                        const n = notification_data as QuoteNotificationEntity;
                        if (n.quote_tweet_id && tweet_map.has(n.quote_tweet_id)) {
                            let t = tweet_map.get(n.quote_tweet_id)!;
                            if (n.parent_tweet_id && tweet_map.has(n.parent_tweet_id)) {
                                t = {
                                    ...t,
                                    parent_tweet: this.cleanTweet(
                                        tweet_map.get(n.parent_tweet_id)!
                                    ),
                                } as any;
                            }
                            enriched_payload.quote_tweet = this.enrichTweetWithStatus(t);
                        }
                    }
                }
            } else if (
                notification_data.type === NotificationType.LIKE ||
                notification_data.type === NotificationType.REPOST
            ) {
                if (notification_data.type === NotificationType.LIKE) {
                    if (payload.tweet) {
                        enriched_payload.tweet = this.cleanTweet(payload.tweet);
                    }
                    if (payload.liker) {
                        enriched_payload.liker = this.cleanUser(payload.liker);
                    }
                } else if (notification_data.type === NotificationType.REPOST) {
                    if (payload.tweet) {
                        enriched_payload.tweet = this.cleanTweet(payload.tweet);
                    }
                    if (payload.reposter) {
                        enriched_payload.reposter = this.cleanUser(payload.reposter);
                    }
                }
            } else if (notification_data.type === NotificationType.FOLLOW) {
                enriched_payload.follower = {
                    id: payload.follower_id,
                    username: payload.follower_username,
                    name: payload.follower_name,
                    avatar_url: payload.follower_avatar_url,
                };
                delete enriched_payload.follower_id;
                delete enriched_payload.follower_username;
                delete enriched_payload.follower_name;
                delete enriched_payload.follower_avatar_url;
                delete enriched_payload.followed_id;
            }

            const is_online = this.messagesGateway.isOnline(user_id);

            if (is_online && !is_blocked) {
                enriched_payload.created_at = new Date();
                this.notificationsGateway.sendToUser(notification_data.type, user_id, {
                    ...enriched_payload,
                    id: notification_data._id.toString(),
                    action: 'add',
                });
            } else if (!is_blocked) {
                await this.fcmService.sendNotificationToUserDevice(
                    user_id,
                    notification_data.type,
                    {
                        ...payload,
                        id: notification_data._id.toString(),
                    }
                );
            }
        } else {
            await this.notificationModel.updateOne(
                { user: user_id },
                { $inc: { newest_count: 1 } }
            );

            const aggregated_notification_with_data = await this.fetchNotificationWithData(
                user_id,
                aggregation_result.updated_notification
            );

            const is_online = this.messagesGateway.isOnline(user_id);

            if (is_online) {
                aggregated_notification_with_data.created_at = new Date();
                this.notificationsGateway.sendToUser(notification_data.type, user_id, {
                    ...aggregated_notification_with_data,
                    action: 'aggregate',
                    old_notification: aggregation_result.old_notification,
                });
            } else {
                await this.fcmService.sendNotificationToUserDevice(
                    user_id,
                    notification_data.type,
                    {
                        ...payload,
                        action: 'aggregate',
                    }
                );
            }
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
                        id: old_notification._id ? old_notification._id.toString() : undefined,
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
                // This matches notifications that have the same tweet AND only one tweet (either single notification or already aggregated by tweet)
                const matching_by_tweet_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.LIKE) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    // Match if: same tweet, only one tweet in array (not aggregated by person)
                    return tweet_id_array.includes(new_tweet_id) && tweet_id_array.length === 1;
                });

                // Second, try to find aggregation by PERSON (same person liking multiple tweets)
                // This matches notifications that have the same person AND only one person (either single notification or already aggregated by person)
                const matching_by_person_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.LIKE) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    const liked_by_array = Array.isArray(n.liked_by) ? n.liked_by : [n.liked_by];
                    // Match if: same person, only one person in array (not aggregated by tweet)
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
                                    'elem.tweet_id.0': { $exists: true },
                                    'elem.tweet_id.1': { $exists: false },
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
                                    'elem.liked_by.0': { $exists: true },
                                    'elem.liked_by.1': { $exists: false },
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
                        id: old_notification._id ? old_notification._id.toString() : undefined,
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
                // This matches notifications that have the same tweet AND only one tweet (either single notification or already aggregated by tweet)
                const matching_by_tweet_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.REPOST) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    const reposted_by_array = Array.isArray(n.reposted_by)
                        ? n.reposted_by
                        : [n.reposted_by];
                    // Match if: same tweet, only one tweet in array (not aggregated by person)
                    return tweet_id_array.includes(new_tweet_id) && tweet_id_array.length === 1;
                });

                // Second, try to find aggregation by PERSON (same person reposting multiple tweets)
                // This matches notifications that have the same person AND only one person (either single notification or already aggregated by person)
                const matching_by_person_index = user_document.notifications.findIndex((n: any) => {
                    if (n.type !== NotificationType.REPOST) return false;
                    if (new Date(n.created_at) < one_day_ago) return false;

                    const reposted_by_array = Array.isArray(n.reposted_by)
                        ? n.reposted_by
                        : [n.reposted_by];
                    const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                    // Match if: same person, only one person in array (not aggregated by tweet)
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

                // Update based on aggregation type and return the updated document
                let updated_doc_repost;
                if (aggregation_type === 'tweet') {
                    // Add the new person to the existing notification for this tweet
                    // Use $exists checks to ensure we only match notifications with exactly 1 tweet
                    // (not aggregated by person)
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
                                    'elem.tweet_id.0': { $exists: true },
                                    'elem.tweet_id.1': { $exists: false },
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
                                    'elem.reposted_by.0': { $exists: true },
                                    'elem.reposted_by.1': { $exists: false },
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
                        id: old_notification._id ? old_notification._id.toString() : undefined,
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

    private async getTweetsWithInteractions(
        tweet_ids: string[],
        user_id: string,
        flag: boolean = false
    ): Promise<Tweet[]> {
        if (tweet_ids.length === 0) return [];

        let query = this.tweet_repository.createQueryBuilder('tweet');

        if (flag) {
            query = query
                .leftJoinAndMapOne(
                    'tweet.current_user_like',
                    TweetLike,
                    'like',
                    'like.tweet_id = tweet.tweet_id AND like.user_id = :user_id',
                    { user_id }
                )
                .leftJoinAndMapOne(
                    'tweet.current_user_repost',
                    TweetRepost,
                    'repost',
                    'repost.tweet_id = tweet.tweet_id AND repost.user_id = :user_id',
                    { user_id }
                )
                .leftJoinAndMapOne(
                    'tweet.current_user_bookmark',
                    TweetBookmark,
                    'bookmark',
                    'bookmark.tweet_id = tweet.tweet_id AND bookmark.user_id = :user_id',
                    { user_id }
                );
        }
        query = query.where('tweet.tweet_id IN (:...tweet_ids)', { tweet_ids });
        return query.getMany();
    }

    private async getUsersWithRelationships(
        user_ids: string[],
        current_user_id: string,
        flag: boolean = false
    ): Promise<User[]> {
        if (user_ids.length === 0) return [];

        const columns = this.user_repository.metadata.columns
            .map((col) => `user.${col.propertyName}`)
            .filter((name) => !name.includes('password') && !name.includes('fcm_token'));

        let query = this.user_repository.createQueryBuilder('user').select(columns);

        if (flag) {
            query = query
                .leftJoinAndMapOne(
                    'user.relation_following',
                    UserFollows,
                    'following',
                    'following.follower_id = :current_user_id AND following.followed_id = user.id',
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    'user.relation_follower',
                    UserFollows,
                    'follower',
                    'follower.followed_id = :current_user_id AND follower.follower_id = user.id',
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    'user.relation_blocked',
                    UserBlocks,
                    'blocked',
                    'blocked.blocker_id = :current_user_id AND blocked.blocked_id = user.id',
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    'user.relation_muted',
                    UserMutes,
                    'muted',
                    'muted.muter_id = :current_user_id AND muted.muted_id = user.id',
                    { current_user_id }
                );
        }
        query = query.where('user.id IN (:...user_ids)', { user_ids });
        return query.getMany();
    }

    private enrichUserWithStatus(user: User): any {
        const user_dto = plainToInstance(UserResponseDTO, user, {
            excludeExtraneousValues: true,
        }) as any;
        user_dto.is_following = !!(user as any).relation_following;
        user_dto.is_follower = !!(user as any).relation_follower;
        user_dto.is_blocked = !!(user as any).relation_blocked;
        user_dto.is_muted = !!(user as any).relation_muted;
        return user_dto;
    }

    private cleanUser(user: User): any {
        const user_dto = plainToInstance(UserResponseDTO, user, {
            excludeExtraneousValues: true,
        }) as any;
        delete user_dto.is_following;
        delete user_dto.is_follower;
        delete user_dto.is_blocked;
        delete user_dto.is_muted;
        return user_dto;
    }

    private enrichTweetWithStatus(tweet: Tweet): any {
        const tweet_dto = plainToInstance(TweetResponseDTO, tweet, {
            excludeExtraneousValues: true,
        }) as any;
        tweet_dto.is_liked = !!(tweet as any).current_user_like;
        tweet_dto.is_reposted = !!(tweet as any).current_user_repost;
        tweet_dto.is_bookmarked = !!(tweet as any).current_user_bookmark;
        return tweet_dto;
    }

    private cleanTweet(tweet: Tweet): any {
        const tweet_dto = plainToInstance(TweetResponseDTO, tweet, {
            excludeExtraneousValues: true,
        }) as any;
        delete tweet_dto.is_liked;
        delete tweet_dto.is_reposted;
        delete tweet_dto.is_bookmarked;
        return tweet_dto;
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
        const user_ids_needing_relationships = new Set<string>();
        const tweet_ids = new Set<string>();
        const tweet_ids_needing_interactions = new Set<string>();

        user_notifications.notifications.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

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
                        user_ids_needing_relationships.add(quote_notification.quoted_by);
                    }
                    if (quote_notification.quote_tweet_id) {
                        tweet_ids.add(quote_notification.quote_tweet_id);
                        tweet_ids_needing_interactions.add(quote_notification.quote_tweet_id);
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
                        user_ids_needing_relationships.add(reply_notification.replied_by);
                        user_ids_needing_relationships.add(reply_notification.replied_by);
                    }
                    if (reply_notification.reply_tweet_id) {
                        tweet_ids.add(reply_notification.reply_tweet_id);
                        tweet_ids_needing_interactions.add(reply_notification.reply_tweet_id);
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
                        user_ids_needing_relationships.add(mention_notification.mentioned_by);
                    }
                    if (mention_notification.tweet_id) {
                        tweet_ids.add(mention_notification.tweet_id);
                        tweet_ids_needing_interactions.add(mention_notification.tweet_id);
                    }
                    if (mention_notification.parent_tweet_id) {
                        tweet_ids.add(mention_notification.parent_tweet_id);
                    }
                    break;
                }
                case NotificationType.MESSAGE: {
                    const message_notification = notification as MessageNotificationEntity;
                    if (message_notification.sent_by) {
                        user_ids.add(message_notification.sent_by);
                    }
                    break;
                }
            }
        });

        const tweet_ids_array = Array.from(tweet_ids);
        const ids_needing_interactions = tweet_ids_array.filter((id) =>
            tweet_ids_needing_interactions.has(id)
        );
        const ids_not_needing_interactions = tweet_ids_array.filter(
            (id) => !tweet_ids_needing_interactions.has(id)
        );

        const user_ids_array = Array.from(user_ids);
        const user_ids_needing_rel_array = user_ids_array.filter((id) =>
            user_ids_needing_relationships.has(id)
        );
        const user_ids_not_needing_rel_array = user_ids_array.filter(
            (id) => !user_ids_needing_relationships.has(id)
        );

        const [
            users_with_rel,
            users_without_rel,
            tweets_with_interactions,
            tweets_without_interactions,
        ] = await Promise.all([
            user_ids_needing_rel_array.length > 0
                ? this.getUsersWithRelationships(user_ids_needing_rel_array, user_id, true)
                : [],
            user_ids_not_needing_rel_array.length > 0
                ? this.getUsersWithRelationships(user_ids_not_needing_rel_array, user_id, false)
                : [],
            ids_needing_interactions.length > 0
                ? this.getTweetsWithInteractions(ids_needing_interactions, user_id, true)
                : [],
            ids_not_needing_interactions.length > 0
                ? this.getTweetsWithInteractions(ids_not_needing_interactions, user_id, false)
                : [],
        ]);

        const users = [...users_with_rel, ...users_without_rel];
        const tweets = [...tweets_with_interactions, ...tweets_without_interactions];

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
                if (!notification._id) return null;
                const notification_id = notification._id.toString();
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
                                return user ? this.cleanUser(user) : undefined;
                            })
                            .filter((user) => user !== undefined);

                        if (followers.length === 0) {
                            return null;
                        }
                        return {
                            id: notification_id,
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
                            .filter((tweet) => tweet !== undefined)
                            .map((tweet) => this.cleanTweet(tweet));

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
                                return user ? this.cleanUser(user) : undefined;
                            })
                            .filter((user) => user !== undefined);

                        if (likers.length === 0) {
                            return null;
                        }

                        return {
                            id: notification_id,
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
                            ...this.enrichTweetWithStatus(quote_tweet),
                            parent_tweet: this.cleanTweet(parent_tweet),
                        };
                        return {
                            id: notification_id,
                            type: notification.type,
                            created_at: notification.created_at,
                            quoter: this.enrichUserWithStatus(quoter),
                            quote_tweet: quote_tweet_with_parent,
                        } as unknown as NotificationDto;
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
                            id: notification_id,
                            type: notification.type,
                            created_at: notification.created_at,
                            replier: this.enrichUserWithStatus(replier),
                            reply_tweet: reply_tweet
                                ? this.enrichTweetWithStatus(reply_tweet)
                                : null,
                            original_tweet: this.cleanTweet(original_tweet),
                            conversation_id: reply_notification.conversation_id,
                        } as unknown as NotificationDto;
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
                            .filter((tweet) => tweet !== undefined)
                            .map((tweet) => this.cleanTweet(tweet));

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
                                return user ? this.cleanUser(user) : undefined;
                            })
                            .filter((user) => user !== undefined);

                        if (reposters.length === 0) {
                            return null;
                        }

                        return {
                            id: notification_id,
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
                                    parent_tweet: this.cleanTweet(parent_tweet),
                                } as any;
                            } else {
                                missing_tweet_ids.add(mention_notification.parent_tweet_id);
                            }
                        }

                        return {
                            id: notification_id,
                            type: notification.type,
                            created_at: notification.created_at,
                            mentioner: this.enrichUserWithStatus(mentioner),
                            tweet: this.enrichTweetWithStatus(mention_tweet),
                            tweet_type: mention_notification.tweet_type,
                        };
                    }
                    case NotificationType.MESSAGE: {
                        const message_notification = notification as MessageNotificationEntity;
                        const sender = user_map.get(message_notification.sent_by);

                        if (!sender) {
                            missing_user_ids.add(message_notification.sent_by);
                            return null;
                        }

                        return {
                            id: notification_id,
                            type: notification.type,
                            created_at: notification.created_at,
                            sender: this.cleanUser(sender),
                            message_id: message_notification.message_id,
                            chat_id: message_notification.chat_id,
                        } as unknown as NotificationDto;
                    }
                    default:
                        return null;
                }
            })
            .filter((notification) => notification !== null);

        const deduplicated_notifications = this.deduplicateNotifications(response_notifications);

        // Clean notifications with missing tweets
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

        const filtered_paginated_notifications = paginated_notifications.filter((notification) => {
            if (notification.type === NotificationType.REPLY) {
                return !(notification as any).replier?.is_blocked;
            } else if (notification.type === NotificationType.MENTION) {
                return !(notification as any).mentioner?.is_blocked;
            } else if (notification.type === NotificationType.QUOTE) {
                return !(notification as any).quoter?.is_blocked;
            }
            return true;
        });

        return {
            notifications: filtered_paginated_notifications,
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

        const user_ids = new Set<string>();
        const user_ids_needing_relationships = new Set<string>();
        const tweet_ids = new Set<string>();
        const tweet_ids_needing_interactions = new Set<string>();

        filtered_notifications.forEach((notification: any) => {
            if (notification.type === NotificationType.MENTION) {
                const mention_notification = notification as MentionNotificationEntity;
                if (mention_notification.mentioned_by) {
                    user_ids.add(mention_notification.mentioned_by);
                    user_ids_needing_relationships.add(mention_notification.mentioned_by);
                }
                if (mention_notification.tweet_id) {
                    tweet_ids.add(mention_notification.tweet_id);
                    tweet_ids_needing_interactions.add(mention_notification.tweet_id);
                }
                if (mention_notification.parent_tweet_id) {
                    tweet_ids.add(mention_notification.parent_tweet_id);
                }
            } else if (notification.type === NotificationType.REPLY) {
                const reply_notification = notification as ReplyNotificationEntity;
                if (reply_notification.replied_by) {
                    user_ids.add(reply_notification.replied_by);
                    user_ids_needing_relationships.add(reply_notification.replied_by);
                }
                if (reply_notification.reply_tweet_id) {
                    tweet_ids.add(reply_notification.reply_tweet_id);
                    tweet_ids_needing_interactions.add(reply_notification.reply_tweet_id);
                }
                if (reply_notification.original_tweet_id) {
                    tweet_ids.add(reply_notification.original_tweet_id);
                }
            }
        });

        const tweet_ids_array = Array.from(tweet_ids);
        const ids_needing_interactions = tweet_ids_array.filter((id) =>
            tweet_ids_needing_interactions.has(id)
        );
        const ids_not_needing_interactions = tweet_ids_array.filter(
            (id) => !tweet_ids_needing_interactions.has(id)
        );

        const user_ids_array = Array.from(user_ids);
        const user_ids_needing_rel_array = user_ids_array.filter((id) =>
            user_ids_needing_relationships.has(id)
        );
        const user_ids_not_needing_rel_array = user_ids_array.filter(
            (id) => !user_ids_needing_relationships.has(id)
        );

        const [
            users_with_rel,
            users_without_rel,
            tweets_with_interactions,
            tweets_without_interactions,
        ] = await Promise.all([
            user_ids_needing_rel_array.length > 0
                ? this.getUsersWithRelationships(user_ids_needing_rel_array, user_id, true)
                : [],
            user_ids_not_needing_rel_array.length > 0
                ? this.getUsersWithRelationships(user_ids_not_needing_rel_array, user_id, false)
                : [],
            ids_needing_interactions.length > 0
                ? this.getTweetsWithInteractions(ids_needing_interactions, user_id, true)
                : [],
            ids_not_needing_interactions.length > 0
                ? this.getTweetsWithInteractions(ids_not_needing_interactions, user_id, false)
                : [],
        ]);

        const users = [...users_with_rel, ...users_without_rel];
        const tweets = [...tweets_with_interactions, ...tweets_without_interactions];

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
                if (!notification._id) return null;
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
                                parent_tweet: this.cleanTweet(parent_tweet),
                            } as any;
                        } else {
                            missing_tweet_ids.add(mention_notification.parent_tweet_id);
                        }
                    }

                    return {
                        id: notification._id ? notification._id.toString() : 'unknown',
                        type: notification.type,
                        created_at: notification.created_at,
                        mentioner: this.enrichUserWithStatus(mentioner),
                        tweet: this.enrichTweetWithStatus(mention_tweet),
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
                        id: notification._id ? notification._id.toString() : 'unknown',
                        type: notification.type,
                        created_at: notification.created_at,
                        replier: this.enrichUserWithStatus(replier),
                        reply_tweet: reply_tweet ? this.enrichTweetWithStatus(reply_tweet) : null,
                        original_tweet: this.cleanTweet(original_tweet),
                        conversation_id: reply_notification.conversation_id,
                    } as unknown as NotificationDto;
                }
                return null;
            })
            .filter((notification) => notification !== null);

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

        const filtered_paginated_notifications = paginated_notifications.filter((notification) => {
            if (notification.type === NotificationType.REPLY) {
                return !(notification as any).replier?.is_blocked;
            } else if (notification.type === NotificationType.MENTION) {
                return !(notification as any).mentioner?.is_blocked;
            }
            return true;
        });

        return {
            notifications: filtered_paginated_notifications,
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
                    const user_ids =
                        follow_notification.followers
                            ?.map((u: any) => u.id)
                            .sort()
                            .join(',') || '';
                    key = `follow:${user_ids}`;

                    if (map.has(key)) {
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
                    key = `${notification.type}:${notification.created_at.toString()}:${Math.random()}`;
                    map.set(key, notification);
                    break;
            }
        }

        return Array.from(map.values());
    }

    async deleteNotificationsByTweetIds(user_id: string, tweet_ids: string[]): Promise<void> {
        try {
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
            for (const missing_user_id of missing_user_ids) {
                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[].follower_id': missing_user_id,
                        },
                    }
                );

                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[].liked_by': missing_user_id,
                        },
                    }
                );

                await this.notificationModel.updateOne(
                    { user: user_id },
                    {
                        $pull: {
                            'notifications.$[].reposted_by': missing_user_id,
                        },
                    }
                );

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

    async removeFollowNotification(user_id: string, follower_id: string): Promise<string | null> {
        try {
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);
            const now = new Date();

            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();
            if (!user_document || !user_document.notifications) return null;

            const notification_index = user_document.notifications.findIndex(
                (n: any) =>
                    n.type === NotificationType.FOLLOW &&
                    new Date(n.created_at) >= one_day_ago &&
                    (Array.isArray(n.follower_id)
                        ? n.follower_id.includes(follower_id)
                        : n.follower_id === follower_id)
            );

            if (notification_index === -1) return null;

            const notification = user_document.notifications[notification_index] as any;
            const notification_id = notification._id ? notification._id.toString() : null;

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

            return result.modifiedCount > 0 || cleanup_result.modifiedCount > 0
                ? notification_id
                : null;
        } catch (error) {
            console.error('Error removing follow notification:', error);
            throw error;
        }
    }

    async removeLikeNotification(
        user_id: string,
        tweet_id: string,
        liked_by: string
    ): Promise<string | null> {
        try {
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);
            const now = new Date();

            // First, check for aggregated notifications
            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();

            if (!user_document || !user_document.notifications) {
                return null;
            }

            const notification_index = user_document.notifications.findIndex((n: any) => {
                if (n.type !== NotificationType.LIKE) return false;
                if (new Date(n.created_at) < one_day_ago) return false;

                const tweet_id_array = Array.isArray(n.tweet_id) ? n.tweet_id : [n.tweet_id];
                const liked_by_array = Array.isArray(n.liked_by) ? n.liked_by : [n.liked_by];

                return tweet_id_array.includes(tweet_id) && liked_by_array.includes(liked_by);
            });

            if (notification_index === -1) {
                return null;
            }

            const notification = user_document.notifications[notification_index] as any;
            const notification_id = notification._id ? notification._id.toString() : undefined;
            const tweet_id_array = Array.isArray(notification.tweet_id)
                ? notification.tweet_id
                : [notification.tweet_id];
            const liked_by_array = Array.isArray(notification.liked_by)
                ? notification.liked_by
                : [notification.liked_by];

            const is_single_tweet = tweet_id_array.length === 1;
            const is_single_person = liked_by_array.length === 1;
            let modified = false;

            if (is_single_tweet && is_single_person) {
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

            return modified || cleanup_result.modifiedCount > 0 ? notification_id : null;
        } catch (error) {
            console.error('Error removing like notification:', error);
            throw error;
        }
    }

    async removeRepostNotification(
        user_id: string,
        tweet_id: string,
        reposted_by: string
    ): Promise<string | null> {
        try {
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);
            const now = new Date();

            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();

            if (!user_document || !user_document.notifications) {
                return null;
            }

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
                return null;
            }

            const notification = user_document.notifications[notification_index] as any;
            const notification_id = notification._id ? notification._id.toString() : undefined;
            const tweet_id_array = Array.isArray(notification.tweet_id)
                ? notification.tweet_id
                : [notification.tweet_id];
            const reposted_by_array = Array.isArray(notification.reposted_by)
                ? notification.reposted_by
                : [notification.reposted_by];

            const is_single_tweet = tweet_id_array.length === 1;
            const is_single_person = reposted_by_array.length === 1;
            let modified = false;

            if (is_single_tweet && is_single_person) {
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

            return modified || cleanup_result.modifiedCount > 0 ? notification_id : null;
        } catch (error) {
            console.error('Error removing repost notification:', error);
            throw error;
        }
    }

    async removeReplyNotification(
        user_id: string,
        reply_tweet_id: string,
        replied_by: string
    ): Promise<string | null> {
        try {
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);

            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();
            if (!user_document || !user_document.notifications) return null;

            const notification_index = user_document.notifications.findIndex(
                (n: any) =>
                    n.type === NotificationType.REPLY &&
                    n.reply_tweet_id === reply_tweet_id &&
                    n.replied_by === replied_by &&
                    new Date(n.created_at) >= one_day_ago
            );

            if (notification_index === -1) return null;

            const notification = user_document.notifications[notification_index] as any;
            const notification_id = notification._id ? notification._id.toString() : null;

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

            return result.modifiedCount > 0 ? notification_id : null;
        } catch (error) {
            console.error('Error removing reply notification:', error);
            throw error;
        }
    }

    async removeQuoteNotification(
        user_id: string,
        quote_tweet_id: string,
        quoted_by: string
    ): Promise<string | null> {
        try {
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);

            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();
            if (!user_document || !user_document.notifications) return null;

            const notification_index = user_document.notifications.findIndex(
                (n: any) =>
                    n.type === NotificationType.QUOTE &&
                    n.quote_tweet_id === quote_tweet_id &&
                    n.quoted_by === quoted_by &&
                    new Date(n.created_at) >= one_day_ago
            );

            if (notification_index === -1) return null;

            const notification = user_document.notifications[notification_index] as any;
            const notification_id = notification._id ? notification._id.toString() : undefined;

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

            return result.modifiedCount > 0 ? notification_id : null;
        } catch (error) {
            console.error('Error removing quote notification:', error);
            throw error;
        }
    }

    async removeMentionNotification(
        user_id: string,
        tweet_id: string,
        mentioned_by: string
    ): Promise<string | null> {
        try {
            const one_day_ago = new Date();
            one_day_ago.setDate(one_day_ago.getDate() - 1);

            const user_document = await this.notificationModel.findOne({ user: user_id }).lean();
            if (!user_document || !user_document.notifications) return null;

            const notification_index = user_document.notifications.findIndex(
                (n: any) =>
                    n.type === NotificationType.MENTION &&
                    n.tweet_id === tweet_id &&
                    n.mentioned_by === mentioned_by &&
                    new Date(n.created_at) >= one_day_ago
            );

            if (notification_index === -1) return null;

            const notification = user_document.notifications[notification_index] as any;
            const notification_id = notification._id ? notification._id.toString() : undefined;

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

            return result.modifiedCount > 0 ? notification_id : null;
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
        const should_fetch_tweet_user =
            notification.type !== NotificationType.LIKE &&
            notification.type !== NotificationType.REPOST;

        const [users, tweets] = await Promise.all([
            user_ids.size > 0
                ? this.user_repository.find({
                      where: { id: In(Array.from(user_ids)) },
                      select: ['id', 'username', 'name', 'avatar_url', 'email'],
                  })
                : [],
            tweet_ids.size > 0
                ? this.tweet_repository.find({
                      where: { tweet_id: In(Array.from(tweet_ids)) },
                      relations: should_fetch_tweet_user ? ['user'] : [],
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
                        return user ? this.cleanUser(user) : undefined;
                    })
                    .filter((user) => user !== undefined);

                // Clean up missing user IDs if any
                if (missing_user_ids.size > 0) {
                    await this.clear_jobs_service.queueClearNotificationByUsers(
                        owner_user_id,
                        Array.from(missing_user_ids)
                    );
                }

                return {
                    id: notification._id ? notification._id.toString() : null,
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
                        return tweet ? this.cleanTweet(tweet) : undefined;
                    })
                    .filter((tweet) => tweet !== undefined);

                const liked_by_ids = Array.isArray(like_notification.liked_by)
                    ? like_notification.liked_by
                    : [like_notification.liked_by as any];

                const likers = liked_by_ids
                    .map((id) => {
                        const user = user_map.get(id);
                        if (!user) {
                            missing_user_ids.add(id);
                        }
                        return user ? this.cleanUser(user) : undefined;
                    })
                    .filter((user) => user !== undefined);

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
                    id: notification._id ? notification._id.toString() : null,
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
                        return tweet ? this.cleanTweet(tweet) : undefined;
                    })
                    .filter((tweet) => tweet !== undefined);

                const reposted_by_ids = Array.isArray(repost_notification.reposted_by)
                    ? repost_notification.reposted_by
                    : [repost_notification.reposted_by as any];

                const reposters = reposted_by_ids
                    .map((id) => {
                        const user = user_map.get(id);
                        if (!user) {
                            missing_user_ids.add(id);
                        }
                        return user ? this.cleanUser(user) : undefined;
                    })
                    .filter((user) => user !== undefined);

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
                    id: notification._id ? notification._id.toString() : null,
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
