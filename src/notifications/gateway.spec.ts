import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { Server, Socket } from 'socket.io';
import { NotificationType } from './enums/notification-types';

describe('NotificationsGateway', () => {
    let gateway: NotificationsGateway;
    let jwt_service: jest.Mocked<JwtService>;
    let config_service: jest.Mocked<ConfigService>;
    let mock_server: Partial<Server>;

    beforeEach(async () => {
        mock_server = {
            use: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsGateway,
                {
                    provide: JwtService,
                    useValue: {
                        verify: jest.fn(),
                        sign: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-secret'),
                    },
                },
            ],
        }).compile();

        gateway = module.get<NotificationsGateway>(NotificationsGateway);
        jwt_service = module.get(JwtService);
        config_service = module.get(ConfigService);

        gateway.server = mock_server as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('onConnection', () => {
        it('should send newest_count on connection', async () => {
            const user_id = 'user-456';
            const mock_client: Partial<Socket> = {
                id: 'socket-123',
                data: {
                    user: { id: user_id },
                },
            };

            const mock_service = {
                getNewestCount: jest.fn().mockResolvedValue(5),
            };

            gateway.setNotificationsService(mock_service);

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            await gateway.onConnection(mock_client as any, user_id);

            expect(console_spy).toHaveBeenCalledWith(
                'NotificationsGateway: New connection:',
                user_id
            );
            expect(mock_service.getNewestCount).toHaveBeenCalledWith(user_id);

            console_spy.mockRestore();
        });

        it('should handle errors when fetching newest_count', async () => {
            const user_id = 'user-456';
            const error = new Error('Database error');
            const mock_client: Partial<Socket> = {
                id: 'socket-123',
                data: {
                    user: { id: user_id },
                },
            };

            const mock_service = {
                getNewestCount: jest.fn().mockRejectedValue(error),
            };

            gateway.setNotificationsService(mock_service);

            const console_spy = jest.spyOn(console, 'error').mockImplementation();

            await gateway.onConnection(mock_client as any, user_id);

            expect(console_spy).toHaveBeenCalledWith(
                'Error fetching newest_count on connection:',
                error
            );

            console_spy.mockRestore();
        });
    });

    describe('onMarkSeen', () => {
        it('should clear newest_count and return success', async () => {
            const mock_client = {
                data: {
                    user: {
                        id: 'user123',
                    },
                },
            };

            const mock_service = {
                clearNewestCount: jest.fn().mockResolvedValue(undefined),
            };

            gateway.setNotificationsService(mock_service);

            await gateway.onMarkSeen(mock_client as any, {});

            expect(mock_service.clearNewestCount).toHaveBeenCalledWith('user123');
        });

        it('should return error if user not authenticated', async () => {
            const mock_client = {
                data: {},
            };

            const result = await gateway.onMarkSeen(mock_client as any, {});

            expect(result).toEqual({ success: false, message: 'User not authenticated' });
        });
    });

    describe('sendToUser', () => {
        it('should send notification to specific user room', () => {
            const notified_id = 'user-123';
            const payload = {
                type: 'follow',
                follower_id: 'user-456',
                follower_name: 'John Doe',
            };

            gateway.sendToUser(NotificationType.FOLLOW, notified_id, payload);

            expect(mock_server.to).toHaveBeenCalledWith(notified_id);
            expect(mock_server.emit).toHaveBeenCalledWith(NotificationType.FOLLOW, payload);
        });

        it('should send like notification to user', () => {
            const notified_id = 'user-789';
            const payload = {
                type: 'like',
                liked_by: 'user-456',
                tweet_id: 'tweet-123',
            };

            gateway.sendToUser(NotificationType.LIKE, notified_id, payload);

            expect(mock_server.to).toHaveBeenCalledWith(notified_id);
            expect(mock_server.emit).toHaveBeenCalledWith(NotificationType.LIKE, payload);
        });

        it('should send reply notification to user', () => {
            const notified_id = 'user-999';
            const payload = {
                type: 'reply',
                replied_by: 'user-456',
                tweet_id: 'tweet-456',
            };

            gateway.sendToUser(NotificationType.REPLY, notified_id, payload);

            expect(mock_server.to).toHaveBeenCalledWith(notified_id);
            expect(mock_server.emit).toHaveBeenCalledWith(NotificationType.REPLY, payload);
        });

        it('should handle empty payload', () => {
            const notified_id = 'user-111';
            const payload = {};

            gateway.sendToUser(NotificationType.FOLLOW, notified_id, payload);

            expect(mock_server.to).toHaveBeenCalledWith(notified_id);
            expect(mock_server.emit).toHaveBeenCalledWith(NotificationType.FOLLOW, payload);
        });
    });
});
