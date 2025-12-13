import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FCMService } from './expo.service';
import { User } from 'src/user/entities';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { Expo } from 'expo-server-sdk';

// Mock expo-server-sdk
jest.mock('expo-server-sdk');

describe('FCMService', () => {
    let service: FCMService;
    let mock_user_repository: any;
    let mock_expo_instance: any;

    const mock_user = {
        id: 'user-123',
        fcm_token: 'ExponentPushToken[mock-token-123]',
        username: 'testuser',
    };

    beforeEach(async () => {
        // Mock Expo instance methods
        mock_expo_instance = {
            sendPushNotificationsAsync: jest.fn().mockResolvedValue([
                {
                    status: 'ok',
                    id: 'mock-receipt-id',
                },
            ]),
            chunkPushNotifications: jest.fn((messages) => [messages]),
            chunkPushNotificationReceiptIds: jest.fn((ids) => [ids]),
            getPushNotificationReceiptsAsync: jest.fn().mockResolvedValue({}),
        };

        // Mock Expo constructor and static method
        (Expo as unknown as jest.Mock).mockImplementation(() => mock_expo_instance);
        (Expo.isExpoPushToken as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

        const mock_query_builder = {
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(mock_user),
        };

        mock_user_repository = {
            findOne: jest.fn().mockResolvedValue(mock_user),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FCMService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mock_user_repository,
                },
            ],
        }).compile();

        service = module.get<FCMService>(FCMService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Constructor', () => {
        it('should initialize Expo SDK client', () => {
            expect(Expo).toHaveBeenCalledWith({
                useFcmV1: true,
            });
        });
    });

    describe('sendToDevice', () => {
        it('should send message to device successfully', async () => {
            const device_token = 'ExponentPushToken[valid-token]';
            const data = { key: 'value', type: 'LIKE' };
            const notification = { title: 'Test Title', body: 'Test Body' };

            const result = await service.sendToDevice(device_token, data, notification);

            expect(Expo.isExpoPushToken).toHaveBeenCalledWith(device_token);
            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith([
                {
                    to: device_token,
                    sound: 'default',
                    title: notification.title,
                    body: notification.body,
                    data: data,
                },
            ]);
            expect(result).toEqual({ status: 'ok', id: 'mock-receipt-id' });
        });

        it('should send message without notification object', async () => {
            const device_token = 'ExponentPushToken[valid-token]';
            const data = { key: 'value' };

            const result = await service.sendToDevice(device_token, data);

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith([
                {
                    to: device_token,
                    sound: 'default',
                    title: undefined,
                    body: undefined,
                    data: data,
                },
            ]);
            expect(result).toEqual({ status: 'ok', id: 'mock-receipt-id' });
        });

        it('should throw error for invalid push token', async () => {
            const invalid_token = 'invalid-token';
            (Expo.isExpoPushToken as unknown as jest.Mock).mockReturnValueOnce(false);

            const logger_spy = jest.spyOn(service['logger'], 'error');

            await expect(service.sendToDevice(invalid_token, { key: 'value' })).rejects.toThrow(
                'Invalid Expo push token'
            );

            expect(logger_spy).toHaveBeenCalledWith(
                `Push token ${invalid_token} is not a valid Expo push token`
            );
        });

        it('should throw error when ticket status is error', async () => {
            mock_expo_instance.sendPushNotificationsAsync.mockResolvedValueOnce([
                {
                    status: 'error',
                    message: 'Device not registered',
                    details: { error: 'DeviceNotRegistered' },
                },
            ]);

            const logger_spy = jest.spyOn(service['logger'], 'error');

            await expect(
                service.sendToDevice('ExponentPushToken[valid]', { key: 'value' })
            ).rejects.toThrow('Device not registered');

            expect(logger_spy).toHaveBeenCalledWith(
                'Error sending push notification: Device not registered'
            );
        });

        it('should log successful send', async () => {
            const logger_spy = jest.spyOn(service['logger'], 'log');

            await service.sendToDevice('ExponentPushToken[valid]', { key: 'value' });

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Expo push notification sent:')
            );
        });
    });

    describe('addUserDeviceToken', () => {
        it('should save FCM token for user successfully', async () => {
            const user_id = 'user-123';
            const device_token = 'new-device-token';

            await service.addUserDeviceToken(user_id, device_token);

            expect(mock_user_repository.update).toHaveBeenCalledWith(user_id, {
                fcm_token: device_token,
            });
        });

        it('should log error and throw when saving token fails', async () => {
            const error = new Error('Database error');
            mock_user_repository.update.mockRejectedValue(error);

            const logger_spy = jest.spyOn(service['logger'], 'error');

            await expect(service.addUserDeviceToken('user-123', 'token')).rejects.toThrow(
                'Database error'
            );

            expect(logger_spy).toHaveBeenCalledWith(
                'Error saving FCM token for user user-123: Database error'
            );
        });
    });

    describe('removeUserDeviceToken', () => {
        it('should remove FCM token for user successfully', async () => {
            const user_id = 'user-123';

            await service.removeUserDeviceToken(user_id);

            expect(mock_user_repository.update).toHaveBeenCalledWith(user_id, {
                fcm_token: null,
            });
        });

        it('should log error and throw when removing token fails', async () => {
            const error = new Error('Database error');
            mock_user_repository.update.mockRejectedValue(error);

            const logger_spy = jest.spyOn(service['logger'], 'error');

            await expect(service.removeUserDeviceToken('user-123')).rejects.toThrow(
                'Database error'
            );

            expect(logger_spy).toHaveBeenCalledWith(
                'Error removing FCM token for user user-123: Database error'
            );
        });
    });

    describe('sendNotificationToUserDevice', () => {
        it('should send LIKE notification successfully', async () => {
            const payload = {
                likers: [{ name: 'John Doe' }],
                tweets: [{ content: 'Tweet content', id: 'tweet-123' }],
                tweet_id: 'tweet-123',
            };

            const result = await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.LIKE,
                payload
            );

            expect(mock_user_repository.createQueryBuilder).toHaveBeenCalledWith('user');

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith([
                {
                    to: 'ExponentPushToken[mock-token-123]',
                    sound: 'default',
                    title: 'Liked by John Doe',
                    body: 'Tweet content',
                    data: {
                        tweet_id: 'tweet-123',
                    },
                },
            ]);

            expect(result).toBe(true);
        });

        it('should send REPLY notification successfully', async () => {
            const payload = {
                replier: { name: 'Jane Smith' },
                reply_tweet: { content: 'Reply content', id: 'tweet-456' },
                tweet_id: 'tweet-456',
            };

            const result = await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.REPLY,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'Jane Smith replied:',
                        body: 'Reply content',
                    }),
                ])
            );

            expect(result).toBe(true);
        });

        it('should send REPOST notification successfully', async () => {
            const payload = {
                reposter: { name: 'Bob Johnson' },
                tweet: { content: 'Tweet content', id: 'tweet-789' },
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.REPOST,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'Reposted by Bob Johnson:',
                        body: 'Tweet content',
                    }),
                ])
            );
        });

        it('should send QUOTE notification successfully', async () => {
            const payload = {
                quoted_by: { username: 'alice' },
                quote: { content: 'Quote content', id: 'tweet-101' },
            };

            await service.sendNotificationToUserDevice('user-123', NotificationType.QUOTE, payload);

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'Yapper',
                        body: '@alice quoted your post and said: Quote content',
                    }),
                ])
            );
        });

        it('should send MENTION notification successfully', async () => {
            const payload = {
                mentioned_by: { name: 'Charlie Wilson' },
                tweet: { content: 'Tweet content', id: 'tweet-202' },
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.MENTION,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'Mentioned by Charlie Wilson:',
                        body: 'Tweet content',
                    }),
                ])
            );
        });

        it('should send MESSAGE notification successfully', async () => {
            const payload = {
                sender: { name: 'David Lee' },
                content: 'Hello!',
                chat_id: 'chat-123',
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.MESSAGE,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'David Lee',
                        body: 'Hello!',
                    }),
                ])
            );
        });

        it('should send FOLLOW notification with follower_name', async () => {
            const payload = {
                follower_username: 'emma',
                follower_id: 'user-303',
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.FOLLOW,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'Yapper',
                        body: '@emma followed you!',
                    }),
                ])
            );
        });

        it('should send notification with fallback content when payload is missing fields', async () => {
            const payload = {
                // Missing required fields
                tweet_id: 'tweet-123',
            };

            const result = await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.LIKE,
                payload
            );

            expect(result).toBe(true);
            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        title: 'Liked by Someone',
                        body: 'your post',
                    }),
                ])
            );
        });

        it('should return false and warn if user has no FCM token', async () => {
            const mock_query_builder = {
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ id: 'user-123', fcm_token: null }),
            };
            mock_user_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const logger_spy = jest.spyOn(service['logger'], 'warn');

            const result = await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.LIKE,
                {}
            );

            expect(logger_spy).toHaveBeenCalledWith('No FCM token found for user user-123');
            expect(mock_expo_instance.sendPushNotificationsAsync).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should return false and warn if user not found', async () => {
            const mock_query_builder = {
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };
            mock_user_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const logger_spy = jest.spyOn(service['logger'], 'warn');

            const result = await service.sendNotificationToUserDevice(
                'user-999',
                NotificationType.LIKE,
                {}
            );

            expect(logger_spy).toHaveBeenCalledWith('No FCM token found for user user-999');
            expect(result).toBe(false);
        });

        it('should log success when notification sent', async () => {
            const logger_spy = jest.spyOn(service['logger'], 'log');

            await service.sendNotificationToUserDevice('user-123', NotificationType.LIKE, {
                likers: [{ name: 'Test' }],
                tweets: [{ content: 'Content', id: 'tweet-1' }],
            });

            expect(logger_spy).toHaveBeenCalledWith('Notification sent via FCM to user user-123');
        });

        it('should return false and log error if sending fails', async () => {
            mock_expo_instance.sendPushNotificationsAsync.mockRejectedValue(
                new Error('Send failed')
            );

            const logger_spy = jest.spyOn(service['logger'], 'error');

            const result = await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.LIKE,
                {
                    likers: [{ name: 'Test' }],
                    tweets: [{ content: 'Content', id: 'tweet-1' }],
                }
            );

            expect(logger_spy).toHaveBeenCalledWith(
                'Error sending FCM notification to user user-123: Send failed'
            );
            expect(result).toBe(false);
        });

        it('should handle payload with nested user object structure', async () => {
            const payload = {
                likers: [
                    {
                        name: 'Complex User',
                        id: 'user-789',
                        username: 'complexuser',
                    },
                ],
                tweets: [{ content: 'Tweet content', id: 'tweet-123' }],
                tweet_id: 'tweet-123',
            };

            await service.sendNotificationToUserDevice('user-123', NotificationType.LIKE, payload);

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        data: {
                            tweet_id: 'tweet-123',
                        },
                    }),
                ])
            );
        });
    });
});
