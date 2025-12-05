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
                    },
                },
                {
                    provide: PaginationService,
                    useValue: {
                        applyCursorPagination: jest.fn((qb) => qb),
                        generateNextCursor: jest.fn(),
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
            expect(result).toEqual(mock_chat);
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
});
