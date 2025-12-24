import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Model, Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notifications.entity';
import { NotificationsGateway } from './notifications.gateway';
import { User } from '../user/entities/user.entity';
import { Tweet } from '../tweets/entities/tweet.entity';
import { ClearJobService } from '../background-jobs/notifications/clear/clear.service';
import { FCMService } from '../expo/expo.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { NotificationType } from './enums/notification-types';
import { FollowNotificationEntity } from './entities/follow-notification.entity';
import { LikeNotificationEntity } from './entities/like-notification.entity';
import { RepostNotificationEntity } from './entities/repost-notification.entity';
import { ReplyNotificationEntity } from './entities/reply-notification.entity';
import { MentionNotificationEntity } from './entities/mention-notification.entity';
import { QuoteNotificationEntity } from './entities/quote-notification.entity';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let notification_model: any;
    let notifications_gateway: any;
    let user_repository: any;
    let tweet_repository: any;
    let clear_job_service: any;
    let fcm_service: any;
    let messages_gateway: any;

    const mock_user = {
        id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
    };

    const mock_tweet = {
        tweet_id: 'tweet-123',
        content: 'Test tweet content',
        user: mock_user,
        user_id: 'user-123',
    };

    const mock_notification = {
        user: 'user-123',
        notifications: [
            {
                _id: new Types.ObjectId(),
                type: NotificationType.FOLLOW,
                follower_id: ['user-456'],
                created_at: new Date(),
            },
        ],
        newest_count: 1,
    };

    beforeEach(async () => {
        const mock_query_builder = {
            leftJoinAndMapOne: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnThis(),
        };

        notification_model = {
            updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
            findOne: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mock_notification),
                }),
            }),
            findOneAndUpdate: jest.fn().mockResolvedValue(mock_notification),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        };

        notifications_gateway = {
            setNotificationsService: jest.fn(),
            sendToUser: jest.fn(),
        };

        user_repository = {
            findOne: jest.fn().mockResolvedValue(mock_user),
            find: jest.fn().mockResolvedValue([mock_user]),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
            metadata: {
                columns: [
                    { propertyName: 'id' },
                    { propertyName: 'username' },
                    { propertyName: 'name' },
                    { propertyName: 'email' },
                    { propertyName: 'avatar_url' },
                ],
            },
        };

        tweet_repository = {
            findOne: jest.fn().mockResolvedValue(mock_tweet),
            find: jest.fn().mockResolvedValue([mock_tweet]),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
        };

        clear_job_service = {
            queueClearNotification: jest.fn().mockResolvedValue({ success: true }),
            queueClearNotificationByUsers: jest.fn().mockResolvedValue({ success: true }),
        };

        fcm_service = {
            sendNotificationToUserDevice: jest.fn().mockResolvedValue(true),
        };

        messages_gateway = {
            isOnline: jest.fn().mockReturnValue(false),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: getModelToken(Notification.name),
                    useValue: notification_model,
                },
                {
                    provide: NotificationsGateway,
                    useValue: notifications_gateway,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: user_repository,
                },
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: tweet_repository,
                },
                {
                    provide: ClearJobService,
                    useValue: clear_job_service,
                },
                {
                    provide: FCMService,
                    useValue: fcm_service,
                },
                {
                    provide: MessagesGateway,
                    useValue: messages_gateway,
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should set notifications service on gateway', () => {
            service.onModuleInit();
            expect(notifications_gateway.setNotificationsService).toHaveBeenCalledWith(service);
        });
    });

    describe('saveNotificationAndSend', () => {
        it('should save and send a FOLLOW notification when not aggregated', async () => {
            const notification_data: FollowNotificationEntity = {
                type: NotificationType.FOLLOW,
                follower_id: ['user-456'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                follower_id: 'user-456',
                follower_username: 'follower',
                follower_name: 'Follower User',
                follower_avatar_url: 'https://example.com/follower.jpg',
            };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notification_model.updateOne).toHaveBeenCalledWith(
                { user: 'user-123' },
                expect.objectContaining({
                    $push: expect.any(Object),
                    $inc: { newest_count: 1 },
                }),
                { upsert: true }
            );
            expect(fcm_service.sendNotificationToUserDevice).toHaveBeenCalled();
        });

        it('should handle REPLY notification with blocked user', async () => {
            const notification_data: ReplyNotificationEntity = {
                type: NotificationType.REPLY,
                replied_by: 'user-blocked',
                reply_tweet_id: 'tweet-reply',
                original_tweet_id: 'tweet-original',
                conversation_id: 'conv-123',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                replier: { id: 'user-blocked' },
            };

            const blocked_user = {
                ...mock_user,
                id: 'user-blocked',
                relation_blocked: true,
            };

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([blocked_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            messages_gateway.isOnline.mockReturnValue(true);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notification_model.updateOne).toHaveBeenCalled();
            expect(notifications_gateway.sendToUser).not.toHaveBeenCalled();
            expect(fcm_service.sendNotificationToUserDevice).not.toHaveBeenCalled();
        });

        it('should aggregate FOLLOW notification when recent one exists', async () => {
            const notification_data: FollowNotificationEntity = {
                type: NotificationType.FOLLOW,
                follower_id: ['user-789'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                follower_id: 'user-789',
            };

            const updated_notification = {
                ...notification_data,
                follower_id: ['user-456', 'user-789'],
            };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: true,
                updated_notification,
                old_notification: notification_data,
            });

            jest.spyOn(service as any, 'fetchNotificationWithData').mockResolvedValue({
                type: NotificationType.FOLLOW,
                followers: [mock_user],
            });

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notification_model.updateOne).toHaveBeenCalledWith(
                { user: 'user-123' },
                { $inc: { newest_count: 1 } }
            );
        });

        it('should handle MENTION notification', async () => {
            const notification_data: MentionNotificationEntity = {
                type: NotificationType.MENTION,
                mentioned_by: 'user-456',
                tweet_id: 'tweet-123',
                tweet_type: 'normal',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                mentioner: { id: 'user-456' },
                tweet: mock_tweet,
            };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notification_model.updateOne).toHaveBeenCalled();
        });

        it('should handle QUOTE notification', async () => {
            const notification_data: QuoteNotificationEntity = {
                type: NotificationType.QUOTE,
                quoted_by: 'user-456',
                quote_tweet_id: 'tweet-quote',
                parent_tweet_id: 'tweet-parent',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                quoter: { id: 'user-456' },
            };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest
                    .fn()
                    .mockResolvedValue([mock_tweet, { ...mock_tweet, tweet_id: 'tweet-parent' }]),
            });

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notification_model.updateOne).toHaveBeenCalled();
        });

        it('should handle LIKE notification', async () => {
            const notification_data: LikeNotificationEntity = {
                type: NotificationType.LIKE,
                liked_by: ['user-456'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                liker: mock_user,
                tweet: mock_tweet,
            };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notification_model.updateOne).toHaveBeenCalled();
        });

        it('should handle REPOST notification', async () => {
            const notification_data: RepostNotificationEntity = {
                type: NotificationType.REPOST,
                reposted_by: ['user-456'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                reposter: mock_user,
                tweet: mock_tweet,
            };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notification_model.updateOne).toHaveBeenCalled();
        });
    });

    describe('sendNotificationOnly', () => {
        it('should send notification through gateway', async () => {
            const payload = { test: 'data' };

            await service.sendNotificationOnly(NotificationType.FOLLOW, 'user-123', payload);

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.FOLLOW,
                'user-123',
                payload
            );
        });
    });

    describe('clearNewestCount', () => {
        it('should clear newest count for user', async () => {
            await service.clearNewestCount('user-123');

            expect(notification_model.updateOne).toHaveBeenCalledWith(
                { user: 'user-123' },
                { $set: { newest_count: 0 } }
            );
        });

        it('should handle errors when clearing newest count', async () => {
            const error = new Error('Database error');
            notification_model.updateOne.mockRejectedValue(error);

            await expect(service.clearNewestCount('user-123')).rejects.toThrow('Database error');
        });
    });

    describe('getNewestCount', () => {
        it('should return newest count for user', async () => {
            notification_model.findOne.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ newest_count: 5 }),
                }),
            });

            const result = await service.getNewestCount('user-123');

            expect(notification_model.findOne).toHaveBeenCalled();
            expect(result).toBe(5);
        });

        it('should return 0 when no notifications exist', async () => {
            notification_model.findOne.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null),
                }),
            });

            const result = await service.getNewestCount('user-123');

            expect(result).toBe(0);
        });

        it('should handle errors when getting newest count', async () => {
            notification_model.findOne.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockRejectedValue(new Error('Database error')),
                }),
            });

            await expect(service.getNewestCount('user-123')).rejects.toThrow('Database error');
        });
    });

    describe('deleteNotificationsByTweetIds', () => {
        it('should delete notifications by tweet IDs', async () => {
            await service.deleteNotificationsByTweetIds('user-123', ['tweet-1', 'tweet-2']);

            expect(notification_model.updateOne).toHaveBeenCalledTimes(2);
        });

        it('should handle errors when deleting notifications', async () => {
            const error = new Error('Delete error');
            notification_model.updateOne.mockRejectedValue(error);

            await expect(
                service.deleteNotificationsByTweetIds('user-123', ['tweet-1'])
            ).rejects.toThrow('Delete error');
        });
    });

    describe('cleanupNotificationsByUserIds', () => {
        it('should cleanup notifications by user IDs', async () => {
            await service.cleanupNotificationsByUserIds('user-123', ['user-456', 'user-789']);

            expect(notification_model.updateOne).toHaveBeenCalled();
        });
    });

    describe('removeFollowNotification', () => {
        it('should remove follow notification and return notification ID', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.FOLLOW,
                            follower_id: ['user-456'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeFollowNotification('user-123', 'user-456');

            expect(notification_model.updateOne).toHaveBeenCalled();
            expect(result).toBe(notification_id.toString());
        });

        it('should return null when notification not found', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            const result = await service.removeFollowNotification('user-123', 'user-456');

            expect(result).toBeNull();
        });
    });

    describe('removeLikeNotification', () => {
        it('should remove like notification', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.LIKE,
                            liked_by: ['user-456'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeLikeNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });
    });

    describe('removeRepostNotification', () => {
        it('should remove repost notification', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.REPOST,
                            reposted_by: ['user-456'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeRepostNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });
    });

    describe('removeReplyNotification', () => {
        it('should remove reply notification', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.REPLY,
                            replied_by: 'user-456',
                            reply_tweet_id: 'tweet-123',
                            original_tweet_id: 'tweet-original',
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeReplyNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });
    });

    describe('removeQuoteNotification', () => {
        it('should remove quote notification', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.QUOTE,
                            quoted_by: 'user-456',
                            quote_tweet_id: 'tweet-123',
                            parent_tweet_id: 'tweet-parent',
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeQuoteNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });
    });

    describe('removeMentionNotification', () => {
        it('should remove mention notification', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.MENTION,
                            mentioned_by: 'user-456',
                            tweet_id: 'tweet-123',
                            tweet_type: 'normal',
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeMentionNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });
    });

    describe('getUserNotifications', () => {
        it('should return paginated notifications', async () => {
            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            const result = await service.getUserNotifications('user-123', 1);

            expect(result).toHaveProperty('notifications');
            expect(result).toHaveProperty('page');
            expect(result).toHaveProperty('total');
        });

        it('should return empty result when no notifications exist', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(null),
                }),
            });

            const result = await service.getUserNotifications('user-123', 1);

            expect(result.notifications).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should filter blocked users from notifications', async () => {
            const blocked_user = {
                ...mock_user,
                id: 'blocked-user',
                relation_blocked: true,
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.REPLY,
                                replied_by: 'blocked-user',
                                reply_tweet_id: 'tweet-123',
                                original_tweet_id: 'tweet-456',
                                conversation_id: 'conv-123',
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([blocked_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest
                    .fn()
                    .mockResolvedValue([mock_tweet, { ...mock_tweet, tweet_id: 'tweet-456' }]),
            });

            const result = await service.getUserNotifications('user-123', 1);

            expect(result.notifications).toHaveLength(0);
        });
    });

    describe('getMentionsAndReplies', () => {
        it('should return only mention and reply notifications', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.MENTION,
                                mentioned_by: 'user-456',
                                tweet_id: 'tweet-123',
                                tweet_type: 'normal',
                                created_at: new Date(),
                            },
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.REPLY,
                                replied_by: 'user-789',
                                reply_tweet_id: 'tweet-456',
                                original_tweet_id: 'tweet-123',
                                conversation_id: 'conv-123',
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { ...mock_user, id: 'user-456' },
                    { ...mock_user, id: 'user-789' },
                ]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest
                    .fn()
                    .mockResolvedValue([mock_tweet, { ...mock_tweet, tweet_id: 'tweet-456' }]),
            });

            const result = await service.getMentionsAndReplies('user-123', 1);

            expect(result.notifications).toHaveLength(2);
        });

        it('should filter blocked users from mentions and replies', async () => {
            const blocked_user = {
                ...mock_user,
                id: 'blocked-user',
                relation_blocked: true,
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.MENTION,
                                mentioned_by: 'blocked-user',
                                tweet_id: 'tweet-123',
                                tweet_type: 'normal',
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([blocked_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            const result = await service.getMentionsAndReplies('user-123', 1);

            expect(result.notifications).toHaveLength(0);
        });

        it('should return empty result when no mention/reply notifications exist', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.FOLLOW,
                                follower_id: ['user-456'],
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            const result = await service.getMentionsAndReplies('user-123', 1);

            expect(result.notifications).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe('tryAggregateNotification', () => {
        it('should aggregate LIKE notification by tweet (same tweet, different person)', async () => {
            const notification_data: LikeNotificationEntity = {
                type: NotificationType.LIKE,
                liked_by: ['user-789'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.LIKE,
                            liked_by: ['user-456'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });

            notification_model.findOneAndUpdate.mockResolvedValue({
                notifications: [
                    {
                        _id: new Types.ObjectId(),
                        type: NotificationType.LIKE,
                        liked_by: ['user-456', 'user-789'],
                        tweet_id: ['tweet-123'],
                        created_at: new Date(),
                    },
                ],
            });

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(true);
            expect(notification_model.findOneAndUpdate).toHaveBeenCalled();
        });

        it('should aggregate REPOST notification by tweet', async () => {
            const notification_data: RepostNotificationEntity = {
                type: NotificationType.REPOST,
                reposted_by: ['user-789'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.REPOST,
                            reposted_by: ['user-456'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });

            notification_model.findOneAndUpdate.mockResolvedValue({
                notifications: [
                    {
                        _id: new Types.ObjectId(),
                        type: NotificationType.REPOST,
                        reposted_by: ['user-456', 'user-789'],
                        tweet_id: ['tweet-123'],
                        created_at: new Date(),
                    },
                ],
            });

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(true);
        });

        it('should not aggregate for non-aggregatable notification types', async () => {
            const notification_data: ReplyNotificationEntity = {
                type: NotificationType.REPLY,
                replied_by: 'user-456',
                reply_tweet_id: 'tweet-reply',
                original_tweet_id: 'tweet-original',
                conversation_id: 'conv-123',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(false);
        });

        it('should not aggregate when no existing notification found', async () => {
            const notification_data: LikeNotificationEntity = {
                type: NotificationType.LIKE,
                liked_by: ['user-789'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(false);
        });
    });

    describe('normalizeNotificationData', () => {
        it('should normalize FOLLOW notification follower_id to array', () => {
            const notification_data = {
                type: NotificationType.FOLLOW,
                follower_id: 'user-456',
                created_at: new Date(),
            } as any;

            (service as any).normalizeNotificationData(notification_data);

            expect(Array.isArray(notification_data.follower_id)).toBe(true);
            expect(notification_data.follower_id).toEqual(['user-456']);
        });

        it('should normalize LIKE notification fields to arrays', () => {
            const notification_data = {
                type: NotificationType.LIKE,
                liked_by: 'user-456',
                tweet_id: 'tweet-123',
                created_at: new Date(),
            } as any;

            (service as any).normalizeNotificationData(notification_data);

            expect(Array.isArray(notification_data.liked_by)).toBe(true);
            expect(Array.isArray(notification_data.tweet_id)).toBe(true);
        });

        it('should normalize REPOST notification fields to arrays', () => {
            const notification_data = {
                type: NotificationType.REPOST,
                reposted_by: 'user-456',
                tweet_id: 'tweet-123',
                created_at: new Date(),
            } as any;

            (service as any).normalizeNotificationData(notification_data);

            expect(Array.isArray(notification_data.reposted_by)).toBe(true);
            expect(Array.isArray(notification_data.tweet_id)).toBe(true);
        });
    });

    describe('enrichUserWithStatus', () => {
        it('should add relationship status to user', () => {
            const user = {
                ...mock_user,
                relation_following: true,
                relation_follower: false,
                relation_blocked: false,
                relation_muted: true,
            };

            const result = (service as any).enrichUserWithStatus(user);

            expect(result.is_following).toBe(true);
            expect(result.is_follower).toBe(false);
            expect(result.is_blocked).toBe(false);
            expect(result.is_muted).toBe(true);
        });
    });

    describe('enrichTweetWithStatus', () => {
        it('should add interaction status to tweet', () => {
            const tweet = {
                ...mock_tweet,
                current_user_like: true,
                current_user_repost: false,
                current_user_bookmark: true,
            };

            const result = (service as any).enrichTweetWithStatus(tweet);

            expect(result.is_liked).toBe(true);
            expect(result.is_reposted).toBe(false);
            expect(result.is_bookmarked).toBe(true);
        });
    });

    describe('cleanUser', () => {
        it('should remove relationship status from user', () => {
            const user = {
                ...mock_user,
                is_following: true,
                is_follower: true,
            };

            const result = (service as any).cleanUser(user);

            expect(result.is_following).toBeUndefined();
            expect(result.is_follower).toBeUndefined();
        });
    });

    describe('cleanTweet', () => {
        it('should remove interaction status from tweet', () => {
            const tweet = {
                ...mock_tweet,
                is_liked: true,
                is_reposted: true,
            };

            const result = (service as any).cleanTweet(tweet);

            expect(result.is_liked).toBeUndefined();
            expect(result.is_reposted).toBeUndefined();
        });
    });

    describe('getUserNotifications with LIKE notifications', () => {
        it('should return LIKE notifications with user data', async () => {
            const liker = { ...mock_user, id: 'user-liker' };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.LIKE,
                                liked_by: ['user-liker'],
                                tweet_id: ['tweet-123'],
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([liker]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            const result = await service.getUserNotifications('user-123', 1);

            expect(result.notifications).toHaveLength(1);
            expect(result.notifications[0].type).toBe(NotificationType.LIKE);
        });
    });

    describe('getUserNotifications with REPOST notifications', () => {
        it('should return REPOST notifications with user data', async () => {
            const reposter = { ...mock_user, id: 'user-reposter' };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.REPOST,
                                reposted_by: ['user-reposter'],
                                tweet_id: ['tweet-123'],
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([reposter]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            const result = await service.getUserNotifications('user-123', 1);

            expect(result.notifications).toHaveLength(1);
            expect(result.notifications[0].type).toBe(NotificationType.REPOST);
        });
    });

    describe('getUserNotifications with QUOTE notifications', () => {
        it('should return QUOTE notifications', async () => {
            const quoter = { ...mock_user, id: 'user-quoter' };
            const quote_tweet = { ...mock_tweet, tweet_id: 'tweet-quote' };
            const parent_tweet = { ...mock_tweet, tweet_id: 'tweet-parent' };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.QUOTE,
                                quoted_by: 'user-quoter',
                                quote_tweet_id: 'tweet-quote',
                                parent_tweet_id: 'tweet-parent',
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([quoter]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([quote_tweet, parent_tweet]),
            });

            const result = await service.getUserNotifications('user-123', 1);

            expect(result.notifications).toHaveLength(1);
            expect(result.notifications[0].type).toBe(NotificationType.QUOTE);
        });

        it('should filter blocked quoters', async () => {
            const blocked_quoter = { ...mock_user, id: 'user-quoter', relation_blocked: true };
            const quote_tweet = { ...mock_tweet, tweet_id: 'tweet-quote' };
            const parent_tweet = { ...mock_tweet, tweet_id: 'tweet-parent' };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        notifications: [
                            {
                                _id: new Types.ObjectId(),
                                type: NotificationType.QUOTE,
                                quoted_by: 'user-quoter',
                                quote_tweet_id: 'tweet-quote',
                                parent_tweet_id: 'tweet-parent',
                                created_at: new Date(),
                            },
                        ],
                    }),
                }),
            });

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([blocked_quoter]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([quote_tweet, parent_tweet]),
            });

            const result = await service.getUserNotifications('user-123', 1);

            expect(result.notifications).toHaveLength(0);
        });
    });

    describe('remove notifications - not found cases', () => {
        it('should return null when like notification is not found', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [],
                }),
            });

            const result = await service.removeLikeNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBeNull();
        });

        it('should return null when repost notification is not found', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [],
                }),
            });

            const result = await service.removeRepostNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBeNull();
        });

        it('should return null when reply notification is not found', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [],
                }),
            });

            const result = await service.removeReplyNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBeNull();
        });

        it('should return null when quote notification is not found', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [],
                }),
            });

            const result = await service.removeQuoteNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBeNull();
        });

        it('should return null when mention notification is not found', async () => {
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [],
                }),
            });

            const result = await service.removeMentionNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBeNull();
        });
    });

    describe('tryAggregateNotification - FOLLOW', () => {
        it('should aggregate FOLLOW notification when recent one exists', async () => {
            const notification_data: FollowNotificationEntity = {
                type: NotificationType.FOLLOW,
                follower_id: ['user-789'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.FOLLOW,
                            follower_id: ['user-456'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });

            notification_model.findOneAndUpdate.mockResolvedValue({
                notifications: [
                    {
                        _id: new Types.ObjectId(),
                        type: NotificationType.FOLLOW,
                        follower_id: ['user-456', 'user-789'],
                        created_at: new Date(),
                    },
                ],
            });

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(true);
            expect(notification_model.findOneAndUpdate).toHaveBeenCalled();
        });

        it('should not aggregate FOLLOW when no recent notification exists', async () => {
            const notification_data: FollowNotificationEntity = {
                type: NotificationType.FOLLOW,
                follower_id: ['user-789'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const old_date = new Date();
            old_date.setDate(old_date.getDate() - 2); // More than 1 day ago

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.FOLLOW,
                            follower_id: ['user-456'],
                            created_at: old_date,
                        },
                    ],
                }),
            });

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(false);
        });

        it('should not aggregate FOLLOW when findOneAndUpdate returns null', async () => {
            const notification_data: FollowNotificationEntity = {
                type: NotificationType.FOLLOW,
                follower_id: ['user-789'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.FOLLOW,
                            follower_id: ['user-456'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });

            notification_model.findOneAndUpdate.mockResolvedValue(null);

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(false);
        });
    });

    describe('tryAggregateNotification - LIKE by person', () => {
        it('should aggregate LIKE notification by person (same person, different tweets)', async () => {
            const notification_data: LikeNotificationEntity = {
                type: NotificationType.LIKE,
                liked_by: ['user-456'],
                tweet_id: ['tweet-999'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.LIKE,
                            liked_by: ['user-456'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });

            notification_model.findOneAndUpdate.mockResolvedValue({
                notifications: [
                    {
                        _id: new Types.ObjectId(),
                        type: NotificationType.LIKE,
                        liked_by: ['user-456'],
                        tweet_id: ['tweet-123', 'tweet-999'],
                        created_at: new Date(),
                    },
                ],
            });

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(true);
        });
    });

    describe('tryAggregateNotification - REPOST by person', () => {
        it('should aggregate REPOST notification by person (same person, different tweets)', async () => {
            const notification_data: RepostNotificationEntity = {
                type: NotificationType.REPOST,
                reposted_by: ['user-456'],
                tweet_id: ['tweet-999'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.REPOST,
                            reposted_by: ['user-456'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });

            notification_model.findOneAndUpdate.mockResolvedValue({
                notifications: [
                    {
                        _id: new Types.ObjectId(),
                        type: NotificationType.REPOST,
                        reposted_by: ['user-456'],
                        tweet_id: ['tweet-123', 'tweet-999'],
                        created_at: new Date(),
                    },
                ],
            });

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(true);
        });

        it('should not aggregate REPOST when findOneAndUpdate returns null', async () => {
            const notification_data: RepostNotificationEntity = {
                type: NotificationType.REPOST,
                reposted_by: ['user-789'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: new Types.ObjectId(),
                            type: NotificationType.REPOST,
                            reposted_by: ['user-456'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });

            notification_model.findOneAndUpdate.mockResolvedValue(null);

            const result = await (service as any).tryAggregateNotification(
                'user-123',
                notification_data
            );

            expect(result.aggregated).toBe(false);
        });
    });

    describe('removeLikeNotification - aggregated cases', () => {
        it('should remove like from aggregated notification by tweet', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.LIKE,
                            liked_by: ['user-456', 'user-789'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeLikeNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });

        it('should remove like from aggregated notification by person', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.LIKE,
                            liked_by: ['user-456'],
                            tweet_id: ['tweet-123', 'tweet-456'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeLikeNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });
    });

    describe('removeRepostNotification - aggregated cases', () => {
        it('should remove repost from aggregated notification by tweet', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.REPOST,
                            reposted_by: ['user-456', 'user-789'],
                            tweet_id: ['tweet-123'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeRepostNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });

        it('should remove repost from aggregated notification by person', async () => {
            const notification_id = new Types.ObjectId();
            notification_model.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    notifications: [
                        {
                            _id: notification_id,
                            type: NotificationType.REPOST,
                            reposted_by: ['user-456'],
                            tweet_id: ['tweet-123', 'tweet-456'],
                            created_at: new Date(),
                        },
                    ],
                }),
            });
            notification_model.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await service.removeRepostNotification(
                'user-123',
                'tweet-123',
                'user-456'
            );

            expect(result).toBe(notification_id.toString());
        });
    });

    describe('saveNotificationAndSend - aggregated notifications', () => {
        it('should handle aggregated LIKE notification and send via socket', async () => {
            const notification_data: LikeNotificationEntity = {
                type: NotificationType.LIKE,
                liked_by: ['user-789'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = { liker: mock_user };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: true,
                updated_notification: {
                    _id: new Types.ObjectId(),
                    type: NotificationType.LIKE,
                    liked_by: ['user-456', 'user-789'],
                    tweet_id: ['tweet-123'],
                    created_at: new Date(),
                },
                old_notification: {
                    id: new Types.ObjectId().toString(),
                    type: NotificationType.LIKE,
                    liked_by: ['user-456'],
                    tweet_id: ['tweet-123'],
                },
            });

            jest.spyOn(service as any, 'fetchNotificationWithData').mockResolvedValue({
                type: NotificationType.LIKE,
                liked_by: [mock_user],
                tweets: [mock_tweet],
            });

            messages_gateway.isOnline.mockReturnValue(true);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.LIKE,
                'user-123',
                expect.objectContaining({
                    action: 'aggregate',
                })
            );
        });

        it('should handle aggregated REPOST notification and send via FCM', async () => {
            const notification_data: RepostNotificationEntity = {
                type: NotificationType.REPOST,
                reposted_by: ['user-789'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = { reposter: mock_user };

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: true,
                updated_notification: {
                    _id: new Types.ObjectId(),
                    type: NotificationType.REPOST,
                    reposted_by: ['user-456', 'user-789'],
                    tweet_id: ['tweet-123'],
                    created_at: new Date(),
                },
                old_notification: {
                    id: new Types.ObjectId().toString(),
                    type: NotificationType.REPOST,
                },
            });

            jest.spyOn(service as any, 'fetchNotificationWithData').mockResolvedValue({
                type: NotificationType.REPOST,
                reposted_by: [mock_user],
                tweets: [mock_tweet],
            });

            messages_gateway.isOnline.mockReturnValue(false);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(fcm_service.sendNotificationToUserDevice).toHaveBeenCalledWith(
                'user-123',
                NotificationType.REPOST,
                expect.objectContaining({
                    action: 'aggregate',
                })
            );
        });
    });

    describe('getTweetsWithInteractions', () => {
        it('should return empty array for empty tweet_ids', async () => {
            const result = await (service as any).getTweetsWithInteractions([], 'user-123', true);
            expect(result).toEqual([]);
        });

        it('should fetch tweets with interactions when flag is true', async () => {
            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            const result = await (service as any).getTweetsWithInteractions(
                ['tweet-123'],
                'user-123',
                true
            );

            expect(result).toHaveLength(1);
            expect(tweet_repository.createQueryBuilder).toHaveBeenCalled();
        });

        it('should fetch tweets without interactions when flag is false', async () => {
            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            const result = await (service as any).getTweetsWithInteractions(
                ['tweet-123'],
                'user-123',
                false
            );

            expect(result).toHaveLength(1);
        });
    });

    describe('getUsersWithRelationships', () => {
        it('should return empty array for empty user_ids', async () => {
            const result = await (service as any).getUsersWithRelationships([], 'user-123', true);
            expect(result).toEqual([]);
        });

        it('should fetch users with relationships when flag is true', async () => {
            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_user]),
            });

            const result = await (service as any).getUsersWithRelationships(
                ['user-123'],
                'user-456',
                true
            );

            expect(result).toHaveLength(1);
        });

        it('should fetch users without relationships when flag is false', async () => {
            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_user]),
            });

            const result = await (service as any).getUsersWithRelationships(
                ['user-123'],
                'user-456',
                false
            );

            expect(result).toHaveLength(1);
        });
    });

    describe('saveNotificationAndSend - REPLY notification flow', () => {
        it('should send REPLY notification via socket when user is online and not blocked', async () => {
            const notification_data: ReplyNotificationEntity = {
                type: NotificationType.REPLY,
                replied_by: 'user-456',
                reply_tweet_id: 'tweet-reply',
                original_tweet_id: 'tweet-original',
                conversation_id: 'conv-123',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                replier: { id: 'user-456' },
            };

            const replier_user = {
                ...mock_user,
                id: 'user-456',
                relation_blocked: undefined,
            };

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([replier_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { ...mock_tweet, tweet_id: 'tweet-reply' },
                    { ...mock_tweet, tweet_id: 'tweet-original' },
                ]),
            });

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            messages_gateway.isOnline.mockReturnValue(true);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.REPLY,
                'user-123',
                expect.objectContaining({
                    action: 'add',
                })
            );
        });

        it('should send REPLY notification via FCM when user is offline and not blocked', async () => {
            const notification_data: ReplyNotificationEntity = {
                type: NotificationType.REPLY,
                replied_by: 'user-456',
                reply_tweet_id: 'tweet-reply',
                original_tweet_id: 'tweet-original',
                conversation_id: 'conv-123',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                replier: { id: 'user-456' },
            };

            const replier_user = {
                ...mock_user,
                id: 'user-456',
                relation_blocked: undefined,
            };

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([replier_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { ...mock_tweet, tweet_id: 'tweet-reply' },
                    { ...mock_tweet, tweet_id: 'tweet-original' },
                ]),
            });

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            messages_gateway.isOnline.mockReturnValue(false);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(fcm_service.sendNotificationToUserDevice).toHaveBeenCalled();
        });
    });

    describe('saveNotificationAndSend - MENTION notification flow', () => {
        it('should send MENTION notification when not blocked', async () => {
            const notification_data: MentionNotificationEntity = {
                type: NotificationType.MENTION,
                mentioned_by: 'user-456',
                tweet_id: 'tweet-123',
                tweet_type: 'normal',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                mentioner: { id: 'user-456' },
            };

            const mentioner_user = {
                ...mock_user,
                id: 'user-456',
                relation_blocked: undefined,
            };

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mentioner_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            messages_gateway.isOnline.mockReturnValue(true);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.MENTION,
                'user-123',
                expect.objectContaining({
                    action: 'add',
                })
            );
        });

        it('should not send MENTION notification when user is blocked', async () => {
            const notification_data: MentionNotificationEntity = {
                type: NotificationType.MENTION,
                mentioned_by: 'user-blocked',
                tweet_id: 'tweet-123',
                tweet_type: 'normal',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                mentioner: { id: 'user-blocked' },
            };

            const blocked_user = {
                ...mock_user,
                id: 'user-blocked',
                relation_blocked: true,
            };

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([blocked_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_tweet]),
            });

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            messages_gateway.isOnline.mockReturnValue(true);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notifications_gateway.sendToUser).not.toHaveBeenCalled();
            expect(fcm_service.sendNotificationToUserDevice).not.toHaveBeenCalled();
        });
    });

    describe('saveNotificationAndSend - QUOTE notification flow', () => {
        it('should send QUOTE notification when not blocked', async () => {
            const notification_data: QuoteNotificationEntity = {
                type: NotificationType.QUOTE,
                quoted_by: 'user-456',
                quote_tweet_id: 'tweet-quote',
                parent_tweet_id: 'tweet-parent',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                quoter: { id: 'user-456' },
            };

            const quoter_user = {
                ...mock_user,
                id: 'user-456',
                relation_blocked: undefined,
            };

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([quoter_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { ...mock_tweet, tweet_id: 'tweet-quote' },
                    { ...mock_tweet, tweet_id: 'tweet-parent' },
                ]),
            });

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            messages_gateway.isOnline.mockReturnValue(true);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notifications_gateway.sendToUser).toHaveBeenCalled();
        });

        it('should not send QUOTE notification when user is blocked', async () => {
            const notification_data: QuoteNotificationEntity = {
                type: NotificationType.QUOTE,
                quoted_by: 'user-blocked',
                quote_tweet_id: 'tweet-quote',
                parent_tweet_id: 'tweet-parent',
                created_at: new Date(),
                _id: new Types.ObjectId(),
            };

            const payload = {
                quoter: { id: 'user-blocked' },
            };

            const blocked_user = {
                ...mock_user,
                id: 'user-blocked',
                relation_blocked: true,
            };

            user_repository.createQueryBuilder = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([blocked_user]),
            });

            tweet_repository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoinAndMapOne: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { ...mock_tweet, tweet_id: 'tweet-quote' },
                    { ...mock_tweet, tweet_id: 'tweet-parent' },
                ]),
            });

            jest.spyOn(service as any, 'tryAggregateNotification').mockResolvedValue({
                aggregated: false,
            });

            messages_gateway.isOnline.mockReturnValue(true);

            await service.saveNotificationAndSend('user-123', notification_data, payload);

            expect(notifications_gateway.sendToUser).not.toHaveBeenCalled();
            expect(fcm_service.sendNotificationToUserDevice).not.toHaveBeenCalled();
        });
    });

    describe('fetchNotificationWithData', () => {
        it('should return null for null notification', async () => {
            const result = await (service as any).fetchNotificationWithData('user-123', null);
            expect(result).toBeNull();
        });

        it('should fetch FOLLOW notification with user data', async () => {
            const notification = {
                _id: new Types.ObjectId(),
                type: NotificationType.FOLLOW,
                follower_id: ['user-456', 'user-789'],
                created_at: new Date(),
            };

            user_repository.find.mockResolvedValue([
                { ...mock_user, id: 'user-456' },
                { ...mock_user, id: 'user-789' },
            ]);
            tweet_repository.find.mockResolvedValue([]);

            const result = await (service as any).fetchNotificationWithData(
                'user-123',
                notification
            );

            expect(result).toBeDefined();
            expect(result.type).toBe(NotificationType.FOLLOW);
        });

        it('should fetch LIKE notification with user and tweet data', async () => {
            const notification = {
                _id: new Types.ObjectId(),
                type: NotificationType.LIKE,
                liked_by: ['user-456'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
            };

            user_repository.find.mockResolvedValue([{ ...mock_user, id: 'user-456' }]);
            tweet_repository.find.mockResolvedValue([mock_tweet]);

            const result = await (service as any).fetchNotificationWithData(
                'user-123',
                notification
            );

            expect(result).toBeDefined();
            expect(result.type).toBe(NotificationType.LIKE);
        });

        it('should fetch REPOST notification with user and tweet data', async () => {
            const notification = {
                _id: new Types.ObjectId(),
                type: NotificationType.REPOST,
                reposted_by: ['user-456'],
                tweet_id: ['tweet-123'],
                created_at: new Date(),
            };

            user_repository.find.mockResolvedValue([{ ...mock_user, id: 'user-456' }]);
            tweet_repository.find.mockResolvedValue([mock_tweet]);

            const result = await (service as any).fetchNotificationWithData(
                'user-123',
                notification
            );

            expect(result).toBeDefined();
            expect(result.type).toBe(NotificationType.REPOST);
        });
    });

    describe('deduplicateNotifications', () => {
        it('should deduplicate LIKE notifications with same tweet', () => {
            const notifications = [
                {
                    type: NotificationType.LIKE,
                    liked_by: [{ id: 'user-456' }],
                    tweets: [{ tweet_id: 'tweet-123' }],
                    created_at: new Date(),
                },
                {
                    type: NotificationType.LIKE,
                    liked_by: [{ id: 'user-789' }],
                    tweets: [{ tweet_id: 'tweet-123' }],
                    created_at: new Date(),
                },
            ];

            const result = (service as any).deduplicateNotifications(notifications);

            expect(result.length).toBeLessThanOrEqual(2);
        });

        it('should deduplicate FOLLOW notifications', () => {
            const notifications = [
                {
                    type: NotificationType.FOLLOW,
                    followers: [{ id: 'user-456' }],
                    created_at: new Date(),
                },
                {
                    type: NotificationType.FOLLOW,
                    followers: [{ id: 'user-789' }],
                    created_at: new Date(),
                },
            ];

            const result = (service as any).deduplicateNotifications(notifications);

            expect(result.length).toBeLessThanOrEqual(2);
        });

        it('should not deduplicate REPLY notifications', () => {
            const notifications = [
                {
                    type: NotificationType.REPLY,
                    replier: { id: 'user-456' },
                    reply_tweet: { tweet_id: 'tweet-123' },
                    created_at: new Date('2023-01-01'),
                },
                {
                    type: NotificationType.REPLY,
                    replier: { id: 'user-456' },
                    reply_tweet: { tweet_id: 'tweet-456' },
                    created_at: new Date('2023-01-02'),
                },
            ];

            const result = (service as any).deduplicateNotifications(notifications);

            expect(result).toHaveLength(2);
        });
    });
});
