import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { MessageRepository } from './messages.repository';
import { ChatRepository } from '../chat/chat.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Chat } from '../chat/entities/chat.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/swagger-messages';
import { MessageType } from './entities/message.entity';
import { FCMService } from '../expo/expo.service';
import { MessagesGateway } from './messages.gateway';
import { MessageJobService } from '../background-jobs/notifications/message/message.service';
import { EncryptionService } from '../shared/services/encryption/encryption.service';
import { AzureStorageService } from '../azure-storage/azure-storage.service';
import { ConfigService } from '@nestjs/config';
import { MessageReactionRepository } from './message-reaction.repository';

describe('MessagesService', () => {
    let service: MessagesService;
    let message_repository: jest.Mocked<MessageRepository>;
    let chat_repository: jest.Mocked<ChatRepository>;

    const mock_user_id = 'user-123';
    const mock_chat_id = 'chat-456';
    const mock_message_id = 'message-789';
    const mock_recipient_id = 'user-999';

    const mock_chat = {
        id: mock_chat_id,
        user1_id: mock_user_id,
        user2_id: mock_recipient_id,
        user1: { id: mock_user_id, username: 'user1', name: 'User One', avatar_url: 'avatar1.jpg' },
        user2: {
            id: mock_recipient_id,
            username: 'user2',
            name: 'User Two',
            avatar_url: 'avatar2.jpg',
        },
        created_at: new Date(),
        updated_at: new Date(),
    };

    const mock_message = {
        id: mock_message_id,
        chat_id: mock_chat_id,
        sender_id: mock_user_id,
        content: 'Test message',
        message_type: MessageType.TEXT,
        is_read: false,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        sender: {
            id: mock_user_id,
            username: 'user1',
            name: 'User One',
            avatar_url: 'avatar1.jpg',
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                {
                    provide: MessageRepository,
                    useValue: {
                        createMessage: jest.fn(),
                        findMessagesByChatId: jest.fn(),
                        findMessageById: jest.fn(),
                        updateMessageContent: jest.fn(),
                        deleteMessage: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Chat),
                    useValue: {
                        findOne: jest.fn(),
                        increment: jest.fn(),
                        find: jest.fn(),
                    },
                },
                {
                    provide: PaginationService,
                    useValue: {
                        applyCursorPagination: jest.fn((qb) => qb),
                        generateNextCursor: jest.fn(() => 'next-cursor-123'),
                    },
                },
                {
                    provide: FCMService,
                    useValue: {
                        sendNotificationToUserDevice: jest.fn(),
                    },
                },
                {
                    provide: MessagesGateway,
                    useValue: {
                        isOnline: jest.fn(),
                    },
                },
                {
                    provide: MessageJobService,
                    useValue: {
                        queueMessageNotification: jest.fn(),
                    },
                },
                {
                    provide: EncryptionService,
                    useValue: {
                        encrypt: jest.fn((content) => `encrypted_${content}`),
                        decrypt: jest.fn((content) => content.replace('encrypted_', '')),
                    },
                },
                {
                    provide: AzureStorageService,
                    useValue: {
                        uploadFromUrl: jest.fn(),
                        deleteBlob: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('message-images'),
                    },
                },
                {
                    provide: MessageReactionRepository,
                    useValue: {
                        findOne: jest.fn(),
                        findAndCount: jest.fn(),
                        addReaction: jest.fn(),
                        removeReaction: jest.fn(),
                        getMessageReactions: jest.fn(),
                        getReactionsByMessageIds: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<MessagesService>(MessagesService);
        message_repository = module.get(MessageRepository);
        chat_repository = module.get(getRepositoryToken(Chat));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateChatParticipation', () => {
        it('should throw NotFoundException if chat does not exist', async () => {
            chat_repository.findOne.mockResolvedValue(null);

            await expect(
                service.validateChatParticipation(mock_user_id, mock_chat_id)
            ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND));
        });

        it('should throw ForbiddenException if user is not a participant', async () => {
            const chat = { ...mock_chat, user1_id: 'other-user', user2_id: 'another-user' };
            chat_repository.findOne.mockResolvedValue(chat as any);

            await expect(
                service.validateChatParticipation(mock_user_id, mock_chat_id)
            ).rejects.toThrow(new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT));
        });

        it('should throw NotFoundException if message does not exist when message_id is provided', async () => {
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById.mockResolvedValue(null);

            await expect(
                service.validateChatParticipation(mock_user_id, mock_chat_id, '', mock_message_id)
            ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.MESSAGE_NOT_FOUND));
        });

        it('should throw BadRequestException if message does not belong to chat', async () => {
            const message = { ...mock_message, chat_id: 'different-chat' };
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById.mockResolvedValue(message as any);

            await expect(
                service.validateChatParticipation(mock_user_id, mock_chat_id, '', mock_message_id)
            ).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.MESSAGE_DOES_NOT_BELONG_TO_CHAT)
            );
        });

        it('should throw ForbiddenException if user is not the sender of the message', async () => {
            const message = { ...mock_message, sender_id: 'other-user' };
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById.mockResolvedValue(message as any);

            await expect(
                service.validateChatParticipation(mock_user_id, mock_chat_id, '', mock_message_id)
            ).rejects.toThrow(
                new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_MESSAGE)
            );
        });

        it('should throw BadRequestException if content is empty', async () => {
            chat_repository.findOne.mockResolvedValue(mock_chat as any);

            await expect(
                service.validateChatParticipation(mock_user_id, mock_chat_id, '   ')
            ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED));
        });

        it('should return chat if validation passes', async () => {
            chat_repository.findOne.mockResolvedValue(mock_chat as any);

            const result = await service.validateChatParticipation(
                mock_user_id,
                mock_chat_id,
                'Hello'
            );
            expect(result).toEqual({ chat: mock_chat, participant_id: mock_chat.user2_id });
        });
    });

    describe('sendMessage', () => {
        const send_dto = {
            content: 'Hello World',
            message_type: MessageType.TEXT,
        };

        it('should send a message successfully', async () => {
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.createMessage.mockResolvedValue(mock_message as any);
            chat_repository.increment.mockResolvedValue({
                affected: 1,
                raw: [],
                generatedMaps: [],
            });

            const result = await service.sendMessage(mock_user_id, mock_chat_id, send_dto);

            expect(message_repository.createMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                send_dto,
                false
            );
            expect(chat_repository.increment).toHaveBeenCalledWith(
                { id: mock_chat_id },
                'unread_count_user2',
                1
            );
            expect(result).toEqual({
                ...mock_message,
                recipient_id: mock_recipient_id,
            });
        });

        it('should validate reply message when message_type is REPLY', async () => {
            const reply_dto = {
                content: 'Reply message',
                message_type: MessageType.REPLY,
                reply_to_message_id: 'reply-to-123',
            };
            const reply_to_message = { ...mock_message, id: 'reply-to-123' };

            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById.mockResolvedValue(reply_to_message as any);
            message_repository.createMessage.mockResolvedValue(mock_message as any);

            await service.sendMessage(mock_user_id, mock_chat_id, reply_dto);

            expect(message_repository.findMessageById).toHaveBeenCalledWith('reply-to-123');
        });

        it('should throw NotFoundException if reply_to_message does not exist', async () => {
            const reply_dto = {
                content: 'Reply message',
                message_type: MessageType.REPLY,
                reply_to_message_id: 'non-existent',
            };

            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById.mockResolvedValue(null);

            await expect(
                service.sendMessage(mock_user_id, mock_chat_id, reply_dto)
            ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.REPLY_TO_MESSAGE_NOT_FOUND));
        });
    });

    describe('getMessages', () => {
        const query = { limit: 50 };

        it('should return messages for a chat', async () => {
            const messages = [mock_message];
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessagesByChatId.mockResolvedValue(messages as any);

            const result = await service.getMessages(mock_user_id, mock_chat_id, query);

            expect(chat_repository.findOne).toHaveBeenCalled();
            expect(message_repository.findMessagesByChatId).toHaveBeenCalledWith(
                mock_chat_id,
                query
            );
            expect(result.sender.id).toBe(mock_recipient_id);
            expect(result.messages).toHaveLength(1);
            expect(result.messages[0].content).toBe('Test message');
        });

        it('should map messages correctly', async () => {
            const messages = [
                {
                    ...mock_message,
                    reply_to_message_id: 'reply-123',
                },
            ];
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessagesByChatId.mockResolvedValue(messages as any);

            const result = await service.getMessages(mock_user_id, mock_chat_id, query);

            expect(result.messages[0].reply_to).toBe('reply-123');
            expect(result.messages[0].sender.username).toBe('user1');
        });

        it('should handle pagination with has_more = true', async () => {
            const query = { limit: 2 };
            const messages = [
                mock_message,
                { ...mock_message, id: 'msg-2', content: 'Message 2' },
                { ...mock_message, id: 'msg-3', content: 'Message 3' }, // Extra message
            ];
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessagesByChatId.mockResolvedValue(messages as any);

            const result = await service.getMessages(mock_user_id, mock_chat_id, query);

            expect(result.messages).toHaveLength(2); // Should pop the extra message
            expect(result.has_more).toBe(true);
            expect(result.next_cursor).toBeDefined();
        });
    });

    describe('updateMessage', () => {
        const update_dto = { content: 'Updated message' };

        it('should update a message successfully', async () => {
            const updated_message = {
                ...mock_message,
                content: 'Updated message',
                is_edited: true,
            };
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById.mockResolvedValue(mock_message as any);
            message_repository.updateMessageContent.mockResolvedValue(updated_message as any);

            const result = await service.updateMessage(
                mock_user_id,
                mock_chat_id,
                mock_message_id,
                update_dto
            );

            expect(message_repository.updateMessageContent).toHaveBeenCalledWith(
                mock_message_id,
                'Updated message'
            );
            expect(result.content).toBe('Updated message');
            expect(result.is_edited).toBe(true);
            expect(result.recipient_id).toBe(mock_recipient_id);
        });

        it('should validate chat participation before updating', async () => {
            chat_repository.findOne.mockResolvedValue(null);

            await expect(
                service.updateMessage(mock_user_id, mock_chat_id, mock_message_id, update_dto)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteMessage', () => {
        it('should delete a message successfully', async () => {
            const deleted_message = { ...mock_message, is_deleted: true, deleted_at: new Date() };
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById.mockResolvedValue(mock_message as any);
            message_repository.deleteMessage.mockResolvedValue(deleted_message as any);

            const result = await service.deleteMessage(mock_user_id, mock_chat_id, mock_message_id);

            expect(message_repository.deleteMessage).toHaveBeenCalledWith(mock_message_id);
            expect(result.is_deleted).toBe(true);
            expect(result.recipient_id).toBe(mock_recipient_id);
        });

        it('should validate chat participation before deleting', async () => {
            chat_repository.findOne.mockResolvedValue(null);

            await expect(
                service.deleteMessage(mock_user_id, mock_chat_id, mock_message_id)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getUnreadChatsForUser', () => {
        it('should return unread chats with correct counts', async () => {
            const chats = [
                {
                    id: 'chat-1',
                    user1_id: mock_user_id,
                    user2_id: 'user-other',
                    user1: {
                        id: mock_user_id,
                        username: 'user1',
                        name: 'User One',
                        avatar_url: 'avatar1.jpg',
                    },
                    user2: {
                        id: 'user-other',
                        username: 'user2',
                        name: 'User Two',
                        avatar_url: 'avatar2.jpg',
                    },
                    unread_count_user1: 5,
                    unread_count_user2: 0,
                    updated_at: new Date('2024-01-15'),
                },
                {
                    id: 'chat-2',
                    user1_id: 'user-other2',
                    user2_id: mock_user_id,
                    user1: {
                        id: 'user-other2',
                        username: 'user3',
                        name: 'User Three',
                        avatar_url: 'avatar3.jpg',
                    },
                    user2: {
                        id: mock_user_id,
                        username: 'user1',
                        name: 'User One',
                        avatar_url: 'avatar1.jpg',
                    },
                    unread_count_user1: 0,
                    unread_count_user2: 3,
                    updated_at: new Date('2024-01-16'),
                },
                {
                    id: 'chat-3',
                    user1_id: mock_user_id,
                    user2_id: 'user-other3',
                    user1: {
                        id: mock_user_id,
                        username: 'user1',
                        name: 'User One',
                        avatar_url: 'avatar1.jpg',
                    },
                    user2: {
                        id: 'user-other3',
                        username: 'user4',
                        name: 'User Four',
                        avatar_url: 'avatar4.jpg',
                    },
                    unread_count_user1: 0,
                    unread_count_user2: 0,
                    updated_at: new Date('2024-01-14'),
                },
            ];

            chat_repository.find.mockResolvedValue(chats as any);

            const result = await service.getUnreadChatsForUser(mock_user_id);

            expect(result).toHaveLength(2);
            expect(result[0].chat_id).toBe('chat-1');
            expect(result[0].unread_count).toBe(5);
            expect(result[0].other_user.username).toBe('user2');
            expect(result[1].chat_id).toBe('chat-2');
            expect(result[1].unread_count).toBe(3);
            expect(result[1].other_user.username).toBe('user3');
        });

        it('should return empty array when no unread chats', async () => {
            const chats = [
                {
                    id: 'chat-1',
                    user1_id: mock_user_id,
                    user2_id: 'user-other',
                    user1: {
                        id: mock_user_id,
                        username: 'user1',
                        name: 'User One',
                        avatar_url: 'avatar1.jpg',
                    },
                    user2: {
                        id: 'user-other',
                        username: 'user2',
                        name: 'User Two',
                        avatar_url: 'avatar2.jpg',
                    },
                    unread_count_user1: 0,
                    unread_count_user2: 0,
                    updated_at: new Date(),
                },
            ];

            chat_repository.find.mockResolvedValue(chats as any);

            const result = await service.getUnreadChatsForUser(mock_user_id);

            expect(result).toHaveLength(0);
        });
    });

    describe('uploadMessageImage', () => {
        it('should throw BadRequestException if file not provided', async () => {
            await expect(service.uploadMessageImage(mock_user_id, null as any)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException for invalid file format', async () => {
            const invalid_file = {
                fieldname: 'file',
                originalname: 'test.txt',
                encoding: '7bit',
                mimetype: 'text/plain',
                buffer: Buffer.from('test'),
                size: 1024,
            } as any;

            await expect(service.uploadMessageImage(mock_user_id, invalid_file)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException if file too large', async () => {
            const large_file = {
                fieldname: 'file',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('test'),
                size: 100 * 1024 * 1024,
            } as any;

            await expect(service.uploadMessageImage(mock_user_id, large_file)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('addReaction', () => {
        it('should validate chat participation before adding reaction', async () => {
            chat_repository.findOne.mockResolvedValue(null);

            await expect(
                service.addReaction(mock_user_id, mock_chat_id, mock_message_id, { emoji: '❤️' })
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw error if validation fails', async () => {
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findMessageById = jest.fn().mockResolvedValue(null);

            await expect(
                service.addReaction(mock_user_id, mock_chat_id, 'non-existent', { emoji: '❤️' })
            ).rejects.toThrow();
        });
    });

    describe('removeReaction', () => {
        it('should throw NotFoundException if reaction not found', async () => {
            // Mock validateChatParticipation to succeed
            jest.spyOn(service as any, 'validateChatParticipation').mockResolvedValue(undefined);

            // Mock message_reaction_repository through service
            const reaction_repo = (service as any).message_reaction_repository;
            jest.spyOn(reaction_repo, 'removeReaction').mockResolvedValue(false);

            await expect(
                service.removeReaction(mock_user_id, mock_chat_id, mock_message_id, { emoji: '❤️' })
            ).rejects.toThrow(NotFoundException);
        });

        it('should successfully remove reaction', async () => {
            // Mock validateChatParticipation to succeed
            jest.spyOn(service as any, 'validateChatParticipation').mockResolvedValue(undefined);

            // Mock message_reaction_repository through service
            const reaction_repo = (service as any).message_reaction_repository;
            jest.spyOn(reaction_repo, 'removeReaction').mockResolvedValue(true);

            const result = await service.removeReaction(
                mock_user_id,
                mock_chat_id,
                mock_message_id,
                { emoji: '❤️' }
            );

            expect(result.message).toBeDefined();
        });
    });

    describe('getMessageReactions', () => {
        it('should return empty array when no reactions', async () => {
            chat_repository.findOne.mockResolvedValue(mock_chat as any);

            const reaction_repo = (service as any).message_reaction_repository;
            jest.spyOn(reaction_repo, 'getMessageReactions').mockResolvedValue([]);

            const result = await service.getMessageReactions(
                mock_user_id,
                mock_chat_id,
                mock_message_id
            );

            expect(result).toEqual([]);
        });

        it('should group reactions by emoji', async () => {
            chat_repository.findOne.mockResolvedValue(mock_chat as any);

            const mock_reactions = [
                {
                    id: 'reaction-1',
                    emoji: '❤️',
                    user_id: mock_user_id,
                    user: {
                        id: mock_user_id,
                        username: 'user1',
                        name: 'User One',
                        avatar_url: 'avatar.jpg',
                    },
                },
                {
                    id: 'reaction-2',
                    emoji: '❤️',
                    user_id: 'user-456',
                    user: {
                        id: 'user-456',
                        username: 'user2',
                        name: 'User Two',
                        avatar_url: 'avatar2.jpg',
                    },
                },
            ];

            const reaction_repo = (service as any).message_reaction_repository;
            jest.spyOn(reaction_repo, 'getMessageReactions').mockResolvedValue(mock_reactions);

            const result = await service.getMessageReactions(
                mock_user_id,
                mock_chat_id,
                mock_message_id
            );

            expect(result).toHaveLength(1);
            expect((result[0] as any).emoji).toBe('❤️');
            expect((result[0] as any).count).toBe(2);
            expect((result[0] as any).user_reacted).toBe(true);
        });
    });
});
