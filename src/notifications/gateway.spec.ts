import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './gateway';
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

        gateway.server = mock_server as Server;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('afterInit', () => {
        it('should set up WebSocket middleware', () => {
            const mock_server = {
                use: jest.fn(),
            } as any;

            gateway.afterInit(mock_server);

            expect(mock_server.use).toHaveBeenCalled();
        });
    });

    describe('handleConnection', () => {
        it('should join user to their room on successful connection', () => {
            const mock_client: Partial<Socket> = {
                id: 'socket-123',
                data: {
                    user: {
                        id: 'user-456',
                    },
                },
                join: jest.fn(),
                disconnect: jest.fn(),
            };

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            gateway.handleConnection(mock_client as Socket);

            expect(mock_client.join).toHaveBeenCalledWith('user-456');
            expect(console_spy).toHaveBeenCalledWith(
                'Client connected: socket-123 for user user-456'
            );
            expect(mock_client.disconnect).not.toHaveBeenCalled();

            console_spy.mockRestore();
        });

        it('should disconnect client if user_id is missing', () => {
            const mock_client: Partial<Socket> = {
                id: 'socket-123',
                data: {
                    user: {},
                },
                join: jest.fn(),
                disconnect: jest.fn(),
            };

            gateway.handleConnection(mock_client as Socket);

            expect(mock_client.disconnect).toHaveBeenCalled();
            expect(mock_client.join).not.toHaveBeenCalled();
        });

        it('should disconnect client if user data is missing', () => {
            const mock_client: Partial<Socket> = {
                id: 'socket-123',
                data: {},
                join: jest.fn(),
                disconnect: jest.fn(),
            };

            gateway.handleConnection(mock_client as Socket);

            expect(mock_client.disconnect).toHaveBeenCalled();
            expect(mock_client.join).not.toHaveBeenCalled();
        });
    });

    describe('onMarkSeen', () => {
        it('should return "Hello"', () => {
            const result = gateway.onMarkSeen({}, {});

            expect(result).toBe('Hello');
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
