import { Test, TestingModule } from '@nestjs/testing';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';
import { ChatRepository } from 'src/chat/chat.repository';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';

describe('MessagesGateway', () => {
    let gateway: MessagesGateway;
    let messages_service: jest.Mocked<MessagesService>;
    let chat_repository: jest.Mocked<ChatRepository>;

    const mock_user_id = 'user-123';
    const mock_chat_id = 'chat-456';
    const mock_message_id = 'message-789';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesGateway,
                {
                    provide: MessagesService,
                    useValue: {
                        validateChatParticipation: jest.fn(),
                        sendMessage: jest.fn(),
                        getMessages: jest.fn(),
                        updateMessage: jest.fn(),
                        deleteMessage: jest.fn(),
                        getUnreadChatsForUser: jest.fn(),
                    },
                },
                {
                    provide: ChatRepository,
                    useValue: {
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        verify: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: PaginationService,
                    useValue: {
                        applyCursorPagination: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<MessagesGateway>(MessagesGateway);
        messages_service = module.get(MessagesService);
        chat_repository = module.get(ChatRepository);

        // Mock the server
        gateway.server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('isOnline', () => {
        it('should return true if user has active sockets', () => {
            gateway['userSockets'].set(mock_user_id, new Set(['socket-123']));

            expect(gateway.isOnline(mock_user_id)).toBe(true);
        });

        it('should return false if user has no active sockets', () => {
            expect(gateway.isOnline('unknown-user')).toBe(false);
        });
    });

    describe('onConnection', () => {
        it('should add user socket to userSockets map', async () => {
            const mock_client = {
                id: 'socket-123',
                emit: jest.fn(),
            } as any;

            messages_service.getUnreadChatsForUser.mockResolvedValue([]);

            await gateway.onConnection(mock_client, mock_user_id);

            expect(gateway.isOnline(mock_user_id)).toBe(true);
            const user_sockets = gateway['userSockets'].get(mock_user_id);
            expect(user_sockets).toBeDefined();
            expect(user_sockets?.has('socket-123')).toBe(true);
        });

        it('should add multiple sockets for same user', async () => {
            const mock_client1 = {
                id: 'socket-123',
                emit: jest.fn(),
            } as any;
            const mock_client2 = {
                id: 'socket-456',
                emit: jest.fn(),
            } as any;

            messages_service.getUnreadChatsForUser.mockResolvedValue([]);

            await gateway.onConnection(mock_client1, mock_user_id);
            await gateway.onConnection(mock_client2, mock_user_id);

            const user_sockets = gateway['userSockets'].get(mock_user_id);
            expect(user_sockets?.size).toBe(2);
            expect(user_sockets?.has('socket-123')).toBe(true);
            expect(user_sockets?.has('socket-456')).toBe(true);
        });

        it('should send unread chats on connection', async () => {
            const mock_unread_chats = [
                { id: 'chat-1', unread_count: 2 },
                { id: 'chat-2', unread_count: 1 },
            ];
            const mock_client = {
                id: 'socket-123',
                emit: jest.fn(),
            } as any;

            messages_service.getUnreadChatsForUser.mockResolvedValue(mock_unread_chats as any);

            await gateway.onConnection(mock_client, mock_user_id);

            expect(mock_client.emit).toHaveBeenCalledWith('unread_chats_summary', {
                chats: mock_unread_chats,
                message: 'You have unread messages in these chats',
            });
        });

        it('should handle error when getting unread chats', async () => {
            const mock_client = {
                id: 'socket-123',
                emit: jest.fn(),
            } as any;

            messages_service.getUnreadChatsForUser.mockRejectedValue(new Error('Database error'));

            await expect(gateway.onConnection(mock_client, mock_user_id)).resolves.not.toThrow();
        });
    });

    describe('onDisconnect', () => {
        it('should remove socket from userSockets map', () => {
            const mock_client = {
                id: 'socket-123',
            } as any;

            // First add the socket
            gateway['userSockets'].set(mock_user_id, new Set(['socket-123']));

            gateway.onDisconnect(mock_client, mock_user_id);

            const user_sockets = gateway['userSockets'].get(mock_user_id);
            expect(user_sockets).toBeUndefined();
        });

        it('should remove only the disconnected socket when user has multiple', () => {
            const mock_client = {
                id: 'socket-123',
            } as any;

            gateway['userSockets'].set(mock_user_id, new Set(['socket-123', 'socket-456']));

            gateway.onDisconnect(mock_client, mock_user_id);

            const user_sockets = gateway['userSockets'].get(mock_user_id);
            expect(user_sockets?.size).toBe(1);
            expect(user_sockets?.has('socket-456')).toBe(true);
            expect(user_sockets?.has('socket-123')).toBe(false);
        });

        it('should not throw error if user is not found', () => {
            const mock_client = {
                id: 'socket-123',
            } as any;

            expect(() => gateway.onDisconnect(mock_client, 'unknown-user-id')).not.toThrow();
        });

        it('should handle undefined user_id', () => {
            const mock_client = {
                id: 'socket-123',
            } as any;

            expect(() => gateway.onDisconnect(mock_client, undefined)).not.toThrow();
        });
    });

    describe('handleJoinChat', () => {
        it('should allow user to join chat room', async () => {
            const mock_chat = {
                id: mock_chat_id,
                user1_id: mock_user_id,
                user2_id: 'user-999',
                unread_count_user1: 5,
                unread_count_user2: 0,
            };

            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
                join: jest.fn().mockResolvedValue(undefined),
            } as any;

            messages_service.validateChatParticipation.mockResolvedValue({
                chat: mock_chat,
                participant_id: 'user-999',
            } as any);
            chat_repository.update.mockResolvedValue({} as any);

            const result = await gateway.handleJoinChat(mock_client, {
                chat_id: mock_chat_id,
            });

            expect(messages_service.validateChatParticipation).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id
            );
            expect(chat_repository.update).toHaveBeenCalledWith(
                { id: mock_chat_id },
                { unread_count_user1: 0 }
            );
            expect(mock_client.join).toHaveBeenCalledWith(mock_chat_id);
            expect(result.event).toBe('joined_chat');
            expect(result.data.chat_id).toBe(mock_chat_id);
        });

        it('should set unread count for user2 perspective', async () => {
            const mock_chat = {
                id: mock_chat_id,
                user1_id: 'user-999',
                user2_id: mock_user_id,
                unread_count_user1: 0,
                unread_count_user2: 3,
            };

            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
                join: jest.fn(),
            } as any;

            messages_service.validateChatParticipation.mockResolvedValue({
                chat: mock_chat,
                participant_id: 'user-999',
            } as any);
            chat_repository.update.mockResolvedValue({} as any);

            await gateway.handleJoinChat(mock_client, { chat_id: mock_chat_id });

            expect(chat_repository.update).toHaveBeenCalledWith(
                { id: mock_chat_id },
                { unread_count_user2: 0 }
            );
        });

        it('should return error if validation fails', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
                join: jest.fn(),
            } as any;

            messages_service.validateChatParticipation.mockRejectedValue(
                new Error('Not a participant')
            );

            const result = await gateway.handleJoinChat(mock_client, {
                chat_id: mock_chat_id,
            });

            expect(result.event).toBe('error');
            expect(result.data.message).toBe('Not a participant');
            expect(mock_client.join).not.toHaveBeenCalled();
        });
    });

    describe('handleLeaveChat', () => {
        it('should allow user to leave chat room', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
                leave: jest.fn(),
            } as any;

            messages_service.validateChatParticipation.mockResolvedValue({} as any);

            const result = await gateway.handleLeaveChat(mock_client, {
                chat_id: mock_chat_id,
            });

            expect(messages_service.validateChatParticipation).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id
            );
            expect(mock_client.leave).toHaveBeenCalledWith(mock_chat_id);
            expect(result.event).toBe('left_chat');
        });

        it('should return error if validation fails', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
                leave: jest.fn(),
            } as any;

            messages_service.validateChatParticipation.mockRejectedValue(
                new Error('Chat not found')
            );

            const result = await gateway.handleLeaveChat(mock_client, {
                chat_id: mock_chat_id,
            });

            expect(result.event).toBe('error');
            expect(mock_client.leave).not.toHaveBeenCalled();
        });
    });

    describe('handleSendMessage', () => {
        it('should send message successfully', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            const mock_chat = {
                id: mock_chat_id,
                user1_id: mock_user_id,
                user2_id: 'user-999',
            };

            const mock_message = {
                id: mock_message_id,
                content: 'Test message',
                sender_id: mock_user_id,
                recipient_id: 'user-999',
                chat_id: mock_chat_id,
            };

            messages_service.validateChatParticipation.mockResolvedValue({
                chat: mock_chat,
                participant_id: 'user-999',
            } as any);
            messages_service.sendMessage.mockResolvedValue(mock_message as any);
            jest.spyOn(gateway as any, 'isUserInChatRoom').mockResolvedValue(true);
            jest.spyOn(gateway as any, 'emitToUser').mockImplementation(() => {});

            const result = await gateway.handleSendMessage(mock_client, {
                chat_id: mock_chat_id,
                message: { content: 'Test message' } as any,
            });

            expect(messages_service.sendMessage).toHaveBeenCalled();
            expect(result.event).toBe('message_sent');
            expect(result.data).toEqual(mock_message);
        });

        it('should return error if message exceeds maximum length', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            const long_message = 'a'.repeat(10000);

            const result = await gateway.handleSendMessage(mock_client, {
                chat_id: mock_chat_id,
                message: { content: long_message } as any,
            });

            expect(result.event).toBe('error');
            expect((result.data as any).message).toContain('exceeds maximum length');
        });

        it('should return error if send fails', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            messages_service.validateChatParticipation.mockRejectedValue(
                new Error('Chat not found')
            );

            const result = await gateway.handleSendMessage(mock_client, {
                chat_id: mock_chat_id,
                message: { content: 'Test' } as any,
            });

            expect(result.event).toBe('error');
            expect((result.data as any).message).toBe('Chat not found');
        });
    });

    describe('handleUpdateMessage', () => {
        it('should update message successfully', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            const mock_updated_message = {
                id: mock_message_id,
                content: 'Updated content',
                recipient_id: 'user-999',
            };

            messages_service.updateMessage.mockResolvedValue(mock_updated_message as any);
            jest.spyOn(gateway as any, 'emitToUser').mockImplementation(() => {});

            const result = await gateway.handleUpdateMessage(mock_client, {
                chat_id: mock_chat_id,
                message_id: mock_message_id,
                update: { content: 'Updated content' },
            });

            expect(messages_service.updateMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id,
                { content: 'Updated content' }
            );
            expect(result.event).toBe('message_updated');
        });

        it('should return error if update fails', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            messages_service.updateMessage.mockRejectedValue(new Error('Message not found'));

            const result = await gateway.handleUpdateMessage(mock_client, {
                chat_id: mock_chat_id,
                message_id: mock_message_id,
                update: { content: 'New' },
            });

            expect(result.event).toBe('error');
        });
    });

    describe('handleDeleteMessage', () => {
        it('should delete message successfully', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            const mock_deleted_message = {
                id: mock_message_id,
                recipient_id: 'user-999',
            };

            messages_service.deleteMessage.mockResolvedValue(mock_deleted_message as any);
            jest.spyOn(gateway as any, 'emitToUser').mockImplementation(() => {});

            const result = await gateway.handleDeleteMessage(mock_client, {
                chat_id: mock_chat_id,
                message_id: mock_message_id,
            });

            expect(messages_service.deleteMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id
            );
            expect(result.event).toBe('message_deleted');
        });

        it('should return error if delete fails', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            messages_service.deleteMessage.mockRejectedValue(new Error('Message not found'));

            const result = await gateway.handleDeleteMessage(mock_client, {
                chat_id: mock_chat_id,
                message_id: mock_message_id,
            });

            expect(result.event).toBe('error');
        });
    });

    describe('emitToUser', () => {
        it('should emit event to all user sockets', () => {
            const socket_ids = new Set(['socket-1', 'socket-2']);
            gateway['userSockets'].set(mock_user_id, socket_ids);

            gateway.emitToUser(mock_user_id, 'test_event', { data: 'test' });

            expect(gateway.server.to).toHaveBeenCalledTimes(2);
        });

        it('should not throw error if user has no active sockets', () => {
            expect(() => gateway.emitToUser('non-existent-user', 'test_event', {})).not.toThrow();
        });

        it('should exclude client socket when specified', () => {
            const socket_ids = new Set(['socket-1', 'socket-2']);
            gateway['userSockets'].set(mock_user_id, socket_ids);

            gateway.emitToUser(mock_user_id, 'test_event', { data: 'test' }, 'socket-1');

            expect(gateway.server.to).toHaveBeenCalledTimes(1);
        });
    });

    describe('gateway initialization', () => {
        it('should be defined', () => {
            expect(gateway).toBeDefined();
        });

        it('should have server property settable', () => {
            const mock_server = { to: jest.fn(), emit: jest.fn() };
            gateway.setServer(mock_server as any);

            expect(gateway.server).toEqual(mock_server);
        });
    });
});
