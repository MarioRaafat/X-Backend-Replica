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
                    },
                },
                {
                    provide: ChatRepository,
                    useValue: {
                        findOne: jest.fn(),
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

    describe('handleConnection', () => {
        it('should add user socket to userSockets map', async () => {
            const mock_client = {
                id: 'socket-123',
                user: { id: mock_user_id },
            } as any;

            await gateway.onConnection(mock_client, mock_client.user.id);

            expect(mock_client.user).toBeDefined();
            expect(mock_client.user?.id).toBe(mock_user_id);
        });
    });

    describe('handleDisconnect', () => {
        it('should remove socket from userSockets map', () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            // First add the socket
            gateway['userSockets'].set(mock_user_id, new Set(['socket-123']));

            gateway.onDisconnect(mock_client, mock_user_id);

            const user_sockets = gateway['userSockets'].get(mock_user_id);
            expect(user_sockets).toBeUndefined();
        });

        it('should not throw error if user is not found', () => {
            const mock_client = {
                id: 'socket-123',
                data: {},
            } as any;

            expect(() => gateway.onDisconnect(mock_client, 'unknown-user-id')).not.toThrow();
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

            messages_service.validateChatParticipation.mockResolvedValue(mock_chat as any);
            chat_repository.update = jest.fn().mockResolvedValue(undefined);

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
    });

    describe('handleSendMessage', () => {
        it('should send message and emit to chat room', async () => {
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
            };

            messages_service.validateChatParticipation.mockResolvedValue(mock_chat as any);
            messages_service.sendMessage.mockResolvedValue(mock_message as any);
            jest.spyOn(gateway as any, 'isUserInChatRoom').mockResolvedValue(true);
            jest.spyOn(gateway as any, 'emitToUser').mockImplementation(() => {});

            const result = await gateway.handleSendMessage(mock_client, {
                chat_id: mock_chat_id,
                message: { content: 'Test message' } as any,
            });

            expect(messages_service.sendMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                { content: 'Test message' },
                true
            );
            expect(result.event).toBe('message_sent');
            expect(result.data).toEqual(mock_message);
        });

        it('should return error if send fails', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            messages_service.validateChatParticipation.mockRejectedValue(new Error('Send failed'));

            const result = await gateway.handleSendMessage(mock_client, {
                chat_id: mock_chat_id,
                message: { content: 'Test' } as any,
            });

            expect(result.event).toBe('error');
            expect((result.data as any).message).toBe('Send failed');
        });
    });

    describe('handleUpdateMessage', () => {
        it('should update message and emit to chat room', async () => {
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
            expect(result.data).toEqual(mock_updated_message);
        });
    });

    describe('handleDeleteMessage', () => {
        it('should delete message and emit to chat room', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
            } as any;

            const mock_deleted_message = {
                id: mock_message_id,
                recipient_id: 'user-999',
            };

            messages_service.deleteMessage.mockResolvedValue(mock_deleted_message as any);

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
            expect(result.data).toEqual(mock_deleted_message);
        });
    });

    describe('handleTypingStart', () => {
        it('should emit typing indicator to other users in chat', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as any;

            messages_service.validateChatParticipation.mockResolvedValue({} as any);

            const result = await gateway.handleTypingStart(mock_client, {
                chat_id: mock_chat_id,
            });

            expect(mock_client.to).toHaveBeenCalledWith(mock_chat_id);
            expect(mock_client.emit).toHaveBeenCalledWith('user_typing', {
                chat_id: mock_chat_id,
                user_id: mock_user_id,
            });
            expect(result.event).toBe('typing_started');
        });
    });

    describe('handleTypingStop', () => {
        it('should emit typing stop indicator to other users in chat', async () => {
            const mock_client = {
                id: 'socket-123',
                data: { user: { id: mock_user_id } },
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as any;

            messages_service.validateChatParticipation.mockResolvedValue({} as any);

            const result = await gateway.handleTypingStop(mock_client, {
                chat_id: mock_chat_id,
            });

            expect(mock_client.to).toHaveBeenCalledWith(mock_chat_id);
            expect(mock_client.emit).toHaveBeenCalledWith('user_stopped_typing', {
                chat_id: mock_chat_id,
                user_id: mock_user_id,
            });
            expect(result.event).toBe('typing_stopped');
        });
    });

    describe('emitToUser', () => {
        it('should emit event to all user sockets', () => {
            const socket_ids = new Set(['socket-1', 'socket-2']);
            gateway['userSockets'].set(mock_user_id, socket_ids);

            gateway.emitToUser(mock_user_id, 'test_event', { data: 'test' });

            expect(gateway.server.to).toHaveBeenCalledTimes(2);
            expect(gateway.server.emit).toHaveBeenCalledTimes(2);
        });

        it('should not throw error if user has no active sockets', () => {
            expect(() => gateway.emitToUser('non-existent-user', 'test_event', {})).not.toThrow();
        });
    });
});
