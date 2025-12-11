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
        (Expo as jest.MockedClass<typeof Expo>).mockImplementation(() => mock_expo_instance);
        (Expo.isExpoPushToken as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

        mock_user_repository = {
            findOne: jest.fn().mockResolvedValue(mock_user),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
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
                liker: { name: 'John Doe' },
                tweet_id: 'tweet-123',
            };

            const result = await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.LIKE,
                payload
            );

            expect(mock_user_repository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                select: ['fcm_token'],
            });

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith([
                {
                    to: 'ExponentPushToken[mock-token-123]',
                    sound: 'default',
                    title: 'New LIKE',
                    body: 'John Doe liked your tweet',
                    data: {
                        type: NotificationType.LIKE,
                        ...payload,
                    },
                },
            ]);

            expect(result).toBe(true);
        });

        it('should send REPLY notification successfully', async () => {
            const payload = {
                replier: { name: 'Jane Smith' },
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
                        title: 'New REPLY',
                        body: 'Jane Smith replied to your tweet',
                    }),
                ])
            );

            expect(result).toBe(true);
        });

        it('should send REPOST notification successfully', async () => {
            const payload = {
                reposter: { name: 'Bob Johnson' },
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.REPOST,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        body: 'Bob Johnson reposted your tweet',
                    }),
                ])
            );
        });

        it('should send QUOTE notification successfully', async () => {
            const payload = {
                quoted_by: { name: 'Alice Brown' },
            };

            await service.sendNotificationToUserDevice('user-123', NotificationType.QUOTE, payload);

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        body: 'Alice Brown quoted your tweet',
                    }),
                ])
            );
        });

        it('should send MENTION notification successfully', async () => {
            const payload = {
                mentioned_by: { name: 'Charlie Wilson' },
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.MENTION,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        body: 'Charlie Wilson mentioned you in a tweet',
                    }),
                ])
            );
        });

        it('should send MESSAGE notification successfully', async () => {
            const payload = {
                sender: { name: 'David Lee' },
                message: 'Hello!',
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.MESSAGE,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        body: 'David Lee sent you a message',
                    }),
                ])
            );
        });

        it('should send FOLLOW notification with follower_name', async () => {
            const payload = {
                follower_name: 'Emma Davis',
            };

            await service.sendNotificationToUserDevice(
                'user-123',
                NotificationType.FOLLOW,
                payload
            );

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        body: 'Emma Davis started following you',
                    }),
                ])
            );
        });

        it('should use "Someone" as fallback username when user field not found', async () => {
            const payload = {
                // No user field
                tweet_id: 'tweet-123',
            };

            await service.sendNotificationToUserDevice('user-123', NotificationType.LIKE, payload);

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        body: 'Someone liked your tweet',
                    }),
                ])
            );
        });

        it('should return false and warn if user has no FCM token', async () => {
            mock_user_repository.findOne.mockResolvedValue({ id: 'user-123', fcm_token: null });

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
            mock_user_repository.findOne.mockResolvedValue(null);

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
                liker: { name: 'Test' },
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
                { liker: { name: 'Test' } }
            );

            expect(logger_spy).toHaveBeenCalledWith(
                'Error sending FCM notification to user user-123: Send failed'
            );
            expect(result).toBe(false);
        });

        it('should handle payload with nested user object structure', async () => {
            const payload = {
                liker: {
                    name: 'Complex User',
                    id: 'user-789',
                    username: 'complexuser',
                },
                tweet_id: 'tweet-123',
            };

            await service.sendNotificationToUserDevice('user-123', NotificationType.LIKE, payload);

            expect(mock_expo_instance.sendPushNotificationsAsync).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        data: {
                            type: NotificationType.LIKE,
                            ...payload,
                        },
                    }),
                ])
            );
        });
    });

    describe('extractUsername', () => {
        it('should extract username from liker for LIKE notification', () => {
            const payload = { liker: { name: 'John' } };
            const username = service['extractUsername'](payload, NotificationType.LIKE);
            expect(username).toBe('John');
        });

        it('should extract username from replier for REPLY notification', () => {
            const payload = { replier: { name: 'Jane' } };
            const username = service['extractUsername'](payload, NotificationType.REPLY);
            expect(username).toBe('Jane');
        });

        it('should extract username from reposter for REPOST notification', () => {
            const payload = { reposter: { name: 'Bob' } };
            const username = service['extractUsername'](payload, NotificationType.REPOST);
            expect(username).toBe('Bob');
        });

        it('should extract username from quoted_by for QUOTE notification', () => {
            const payload = { quoted_by: { name: 'Alice' } };
            const username = service['extractUsername'](payload, NotificationType.QUOTE);
            expect(username).toBe('Alice');
        });

        it('should extract username from mentioned_by for MENTION notification', () => {
            const payload = { mentioned_by: { name: 'Charlie' } };
            const username = service['extractUsername'](payload, NotificationType.MENTION);
            expect(username).toBe('Charlie');
        });

        it('should extract username from sender for MESSAGE notification', () => {
            const payload = { sender: { name: 'David' } };
            const username = service['extractUsername'](payload, NotificationType.MESSAGE);
            expect(username).toBe('David');
        });

        it('should extract follower_name for FOLLOW notification', () => {
            const payload = { follower_name: 'Emma' };
            const username = service['extractUsername'](payload, NotificationType.FOLLOW);
            expect(username).toBe('Emma');
        });

        it('should return "Someone" for FOLLOW when follower_name missing', () => {
            const payload = {};
            const username = service['extractUsername'](payload, NotificationType.FOLLOW);
            expect(username).toBe('Someone');
        });

        it('should return "Someone" when user field is missing', () => {
            const payload = {};
            const username = service['extractUsername'](payload, NotificationType.LIKE);
            expect(username).toBe('Someone');
        });

        it('should return "Someone" when user object has no name', () => {
            const payload = { liker: { id: 'user-123' } };
            const username = service['extractUsername'](payload, NotificationType.LIKE);
            expect(username).toBe('Someone');
        });
    });

    describe('getNotificationBody', () => {
        it('should generate correct body for all notification types', () => {
            const test_cases = [
                {
                    type: NotificationType.LIKE,
                    payload: { liker: { name: 'John' } },
                    expected: 'John liked your tweet',
                },
                {
                    type: NotificationType.REPLY,
                    payload: { replier: { name: 'Jane' } },
                    expected: 'Jane replied to your tweet',
                },
                {
                    type: NotificationType.REPOST,
                    payload: { reposter: { name: 'Bob' } },
                    expected: 'Bob reposted your tweet',
                },
                {
                    type: NotificationType.QUOTE,
                    payload: { quoted_by: { name: 'Alice' } },
                    expected: 'Alice quoted your tweet',
                },
                {
                    type: NotificationType.FOLLOW,
                    payload: { follower_name: 'Charlie' },
                    expected: 'Charlie started following you',
                },
                {
                    type: NotificationType.MENTION,
                    payload: { mentioned_by: { name: 'David' } },
                    expected: 'David mentioned you in a tweet',
                },
                {
                    type: NotificationType.MESSAGE,
                    payload: { sender: { name: 'Emma' } },
                    expected: 'Emma sent you a message',
                },
            ];

            test_cases.forEach(({ type, payload, expected }) => {
                const body = service['getNotificationBody'](type, payload);
                expect(body).toBe(expected);
            });
        });

        it('should return generic message for unknown notification type', () => {
            const body = service['getNotificationBody']('UNKNOWN' as any, {});
            expect(body).toBe('You have a new notification');
        });
    });
});
