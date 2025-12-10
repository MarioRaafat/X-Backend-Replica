import { Test, TestingModule } from '@nestjs/testing';
import { BaseGateway } from './gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { MessagesGateway } from '../messages/messages.gateway';
import { Server, Socket } from 'socket.io';

describe('Gateway', () => {
    let gateway: BaseGateway;
    let notifications_gateway: jest.Mocked<NotificationsGateway>;
    let messages_gateway: jest.Mocked<MessagesGateway>;

    const mock_server = {
        use: jest.fn(),
    } as any;

    const mock_socket = {
        id: 'socket-123',
        data: {
            user: {
                id: 'user-123',
                username: 'testuser',
            },
        },
        join: jest.fn(),
        disconnect: jest.fn(),
    } as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BaseGateway,
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
                        get: jest.fn((key: string) => {
                            if (key === 'JWT_SECRET') return 'test-secret';
                            return null;
                        }),
                    },
                },
                {
                    provide: NotificationsGateway,
                    useValue: {
                        setServer: jest.fn(),
                        onConnection: jest.fn(),
                        onMarkSeen: jest.fn(),
                    },
                },
                {
                    provide: MessagesGateway,
                    useValue: {
                        setServer: jest.fn(),
                        onConnection: jest.fn(),
                        onDisconnect: jest.fn(),
                        handleJoinChat: jest.fn(),
                        handleLeaveChat: jest.fn(),
                        handleSendMessage: jest.fn(),
                        handleUpdateMessage: jest.fn(),
                        handleDeleteMessage: jest.fn(),
                        handleTypingStart: jest.fn(),
                        handleTypingStop: jest.fn(),
                        handleGetMessages: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<BaseGateway>(BaseGateway);
        notifications_gateway = module.get(NotificationsGateway);
        messages_gateway = module.get(MessagesGateway);
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('afterInit', () => {
        it('should set up middleware and server instances', () => {
            gateway.afterInit(mock_server);

            expect(mock_server.use).toHaveBeenCalled();
            expect(notifications_gateway.setServer).toHaveBeenCalledWith(mock_server);
            expect(messages_gateway.setServer).toHaveBeenCalledWith(mock_server);
        });
    });

    describe('handleConnection', () => {
        it('should join user room and call gateway connections', async () => {
            await gateway.handleConnection(mock_socket);

            expect(mock_socket.join).toHaveBeenCalledWith('user-123');
            expect(notifications_gateway.onConnection).toHaveBeenCalledWith(
                mock_socket,
                'user-123'
            );
            expect(messages_gateway.onConnection).toHaveBeenCalledWith(mock_socket, 'user-123');
        });

        it('should disconnect if user_id is missing', async () => {
            const invalid_socket = { ...mock_socket, data: {} };
            await gateway.handleConnection(invalid_socket);

            expect(invalid_socket.disconnect).toHaveBeenCalled();
        });
    });

    describe('handleDisconnect', () => {
        it('should call messages gateway disconnect', () => {
            gateway.handleDisconnect(mock_socket);

            expect(messages_gateway.onDisconnect).toHaveBeenCalledWith(mock_socket, 'user-123');
        });
    });

    describe('handleMarkSeen', () => {
        it('should call notifications gateway onMarkSeen', async () => {
            const payload = { notification_id: 'notif-123' };
            await gateway.handleMarkSeen(mock_socket, payload);

            expect(notifications_gateway.onMarkSeen).toHaveBeenCalledWith(mock_socket, payload);
        });
    });

    describe('handleJoinChat', () => {
        it('should call messages gateway handleJoinChat', async () => {
            const data = { chat_id: 'chat-123' };
            await gateway.handleJoinChat(mock_socket, data);

            expect(messages_gateway.handleJoinChat).toHaveBeenCalledWith(mock_socket, data);
        });
    });

    describe('handleLeaveChat', () => {
        it('should call messages gateway handleLeaveChat', async () => {
            const data = { chat_id: 'chat-123' };
            await gateway.handleLeaveChat(mock_socket, data);

            expect(messages_gateway.handleLeaveChat).toHaveBeenCalledWith(mock_socket, data);
        });
    });

    describe('handleSendMessage', () => {
        it('should call messages gateway handleSendMessage', async () => {
            const data = { content: 'Hello' };
            await gateway.handleSendMessage(mock_socket, data);

            expect(messages_gateway.handleSendMessage).toHaveBeenCalledWith(mock_socket, data);
        });
    });

    describe('handleUpdateMessage', () => {
        it('should call messages gateway handleUpdateMessage', async () => {
            const data = { message_id: 'msg-123', content: 'Updated' };
            await gateway.handleUpdateMessage(mock_socket, data);

            expect(messages_gateway.handleUpdateMessage).toHaveBeenCalledWith(mock_socket, data);
        });
    });

    describe('handleDeleteMessage', () => {
        it('should call messages gateway handleDeleteMessage', async () => {
            const data = { message_id: 'msg-123' };
            await gateway.handleDeleteMessage(mock_socket, data);

            expect(messages_gateway.handleDeleteMessage).toHaveBeenCalledWith(mock_socket, data);
        });
    });

    describe('handleTypingStart', () => {
        it('should call messages gateway handleTypingStart', async () => {
            const data = { chat_id: 'chat-123' };
            await gateway.handleTypingStart(mock_socket, data);

            expect(messages_gateway.handleTypingStart).toHaveBeenCalledWith(mock_socket, data);
        });
    });

    describe('handleTypingStop', () => {
        it('should call messages gateway handleTypingStop', async () => {
            const data = { chat_id: 'chat-123' };
            await gateway.handleTypingStop(mock_socket, data);

            expect(messages_gateway.handleTypingStop).toHaveBeenCalledWith(mock_socket, data);
        });
    });

    describe('handleGetMessages', () => {
        it('should call messages gateway handleGetMessages', async () => {
            const data = { chat_id: 'chat-123' };
            await gateway.handleGetMessages(mock_socket, data);

            expect(messages_gateway.handleGetMessages).toHaveBeenCalledWith(mock_socket, data);
        });
    });
});
