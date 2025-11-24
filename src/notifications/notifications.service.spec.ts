import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notifications.entity';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let notification_model: jest.Mocked<Model<Notification>>;

    const mock_notification = {
        user: 'user-123',
        notifications: [
            {
                type: 'follow',
                follower_id: 'user-456',
                follower_name: 'John Doe',
                created_at: new Date(),
                seen: false,
            },
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: getModelToken(Notification.name),
                    useValue: {
                        updateOne: jest.fn(),
                        findOne: jest.fn(),
                        find: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
        notification_model = module.get(getModelToken(Notification.name));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleMessage', () => {
        it('should handle notification message and update user notifications', async () => {
            const data = {
                user_id: 'user-123',
                notification: {
                    type: 'follow',
                    follower_id: 'user-456',
                    follower_name: 'John Doe',
                    created_at: new Date(),
                    seen: false,
                },
            };

            notification_model.updateOne.mockResolvedValueOnce({ acknowledged: true } as any);

            await service.handleMessage(data);

            expect(notification_model.updateOne).toHaveBeenCalledWith(
                { user: data.user_id },
                {
                    $push: {
                        notifications: {
                            $each: [data.notification],
                            $position: 0,
                            $slice: 50,
                        },
                    },
                },
                { upsert: true }
            );
        });

        it('should handle errors during message processing', async () => {
            const data = {
                user_id: 'user-123',
                notification: {
                    type: 'like',
                    liked_by: 'user-789',
                },
            };

            const error = new Error('Database error');
            notification_model.updateOne.mockRejectedValueOnce(error);

            const console_spy = jest.spyOn(console, 'error').mockImplementation();

            await expect(service.handleMessage(data)).rejects.toThrow(error);

            expect(console_spy).toHaveBeenCalledWith(error);
            console_spy.mockRestore();
        });

        it('should handle notification with multiple fields', async () => {
            const data = {
                user_id: 'user-456',
                notification: {
                    type: 'reply',
                    replied_by: 'user-789',
                    tweet_id: 'tweet-123',
                    content: 'Great post!',
                    created_at: new Date(),
                    seen: false,
                },
            };

            notification_model.updateOne.mockResolvedValueOnce({ acknowledged: true } as any);

            await service.handleMessage(data);

            expect(notification_model.updateOne).toHaveBeenCalledWith(
                { user: data.user_id },
                expect.objectContaining({
                    $push: expect.objectContaining({
                        notifications: expect.objectContaining({
                            $each: [data.notification],
                            $position: 0,
                            $slice: 50,
                        }),
                    }),
                }),
                { upsert: true }
            );
        });
    });

    describe('getUserMentionsNotifications', () => {
        it('should be defined', async () => {
            const result = await service.getUserMentionsNotifications('user-123');
            expect(result).toBeUndefined();
        });
    });

    describe('markNotificationsAsSeen', () => {
        it('should be defined', async () => {
            const result = await service.markNotificationsAsSeen('user-123');
            expect(result).toBeUndefined();
        });
    });

    describe('getUnseenCount', () => {
        it('should be defined', async () => {
            const result = await service.getUnseenCount('user-123');
            expect(result).toBeUndefined();
        });
    });

    describe('sendNotification', () => {
        it('should log "Send" when called', async () => {
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            await service.sendNotification({ test: 'notification' });

            expect(console_spy).toHaveBeenCalledWith('Send');
            console_spy.mockRestore();
        });

        it('should handle various notification types', async () => {
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            await service.sendNotification({
                type: 'follow',
                user_id: 'user-123',
            });

            expect(console_spy).toHaveBeenCalledWith('Send');
            console_spy.mockRestore();
        });
    });

    describe('temp', () => {
        it('should be defined and handle any object', async () => {
            const result = await service.temp({ test: 'data' });
            expect(result).toBeUndefined();
        });

        it('should handle null', async () => {
            const result = await service.temp(null);
            expect(result).toBeUndefined();
        });

        it('should handle undefined', async () => {
            const result = await service.temp(undefined);
            expect(result).toBeUndefined();
        });
    });
});
