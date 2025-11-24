import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { CreateChatDto, GetChatsQueryDto, MarkMessagesReadDto } from './dto';

import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../messages/entities/message.entity';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/swagger-messages';

describe('ChatService', () => {
    let service: ChatService;
    let chat_repository: jest.Mocked<ChatRepository>;
    let message_repository: jest.Mocked<Repository<Message>>;

    const mock_user_id = 'user-123';
    const mock_recipient_id = 'user-456';
    const mock_chat_id = 'chat-789';

    const mock_chat = {
        id: mock_chat_id,
        user1_id: mock_user_id,
        user2_id: mock_recipient_id,
        unread_count_user1: 0,
        unread_count_user2: 0,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const mock_message = {
        id: 'message-123',
        chat_id: mock_chat_id,
        sender_id: mock_recipient_id,
        content: 'Test message',
        is_read: false,
        created_at: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatService,
                {
                    provide: ChatRepository,
                    useValue: {
                        createChat: jest.fn(),
                        getChats: jest.fn(),
                        findOne: jest.fn(),
                        updateChat: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Message),
                    useValue: {
                        findOne: jest.fn(),
                        count: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ChatService>(ChatService);
        chat_repository = module.get(ChatRepository);
        message_repository = module.get(getRepositoryToken(Message));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createChat', () => {
        it('should create a chat successfully', async () => {
            const dto: CreateChatDto = { recipient_id: mock_recipient_id };
            chat_repository.createChat.mockResolvedValue(mock_chat as any);

            const result = await service.createChat(mock_user_id, dto);

            expect(chat_repository.createChat).toHaveBeenCalledWith(mock_user_id, dto);
            expect(result).toEqual(mock_chat);
        });

        it('should throw BadRequestException if trying to message yourself', async () => {
            const dto: CreateChatDto = { recipient_id: mock_user_id };

            await expect(service.createChat(mock_user_id, dto)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_MESSAGE_YOURSELF)
            );
            expect(chat_repository.createChat).not.toHaveBeenCalled();
        });
    });

    describe('getChats', () => {
        it('should get chats successfully', async () => {
            const query: GetChatsQueryDto = { limit: 20 };
            const mock_result = {
                data: [mock_chat],
                count: 1,
                next_cursor: null,
            };
            chat_repository.getChats.mockResolvedValue(mock_result as any);

            const result = await service.getChats(mock_user_id, query);

            expect(chat_repository.getChats).toHaveBeenCalledWith(mock_user_id, query);
            expect(result).toEqual(mock_result);
        });
    });

    describe('markMessagesAsRead', () => {
        it('should mark messages as read successfully', async () => {
            const dto: MarkMessagesReadDto = {};
            const mock_query_builder = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 5 }),
            };

            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.createQueryBuilder.mockReturnValue(mock_query_builder as any);
            message_repository.count.mockResolvedValue(0);
            chat_repository.updateChat.mockResolvedValue(mock_chat as any);

            const result = await service.markMessagesAsRead(mock_user_id, mock_chat_id, dto);

            expect(result.chat_id).toBe(mock_chat_id);
            expect(result.messages_marked_read).toBe(5);
            expect(result.read_at).toBeInstanceOf(Date);
        });

        it('should throw NotFoundException if chat does not exist', async () => {
            const dto: MarkMessagesReadDto = {};
            chat_repository.findOne.mockResolvedValue(null);

            await expect(
                service.markMessagesAsRead(mock_user_id, mock_chat_id, dto)
            ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND));
        });

        it('should throw ForbiddenException if user is not a participant', async () => {
            const dto: MarkMessagesReadDto = {};
            const chat = { ...mock_chat, user1_id: 'other-user', user2_id: 'another-user' };
            chat_repository.findOne.mockResolvedValue(chat as any);

            await expect(
                service.markMessagesAsRead(mock_user_id, mock_chat_id, dto)
            ).rejects.toThrow(new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT));
        });

        it('should throw NotFoundException if last_read_message does not exist', async () => {
            const dto: MarkMessagesReadDto = { last_read_message_id: 'non-existent' };
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findOne.mockResolvedValue(null);

            await expect(
                service.markMessagesAsRead(mock_user_id, mock_chat_id, dto)
            ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.MESSAGE_NOT_FOUND));
        });

        it('should throw BadRequestException if last_read_message not in chat', async () => {
            const dto: MarkMessagesReadDto = { last_read_message_id: 'message-999' };
            const message = { ...mock_message, id: 'message-999', chat_id: 'different-chat' };
            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findOne.mockResolvedValue(message as any);

            await expect(
                service.markMessagesAsRead(mock_user_id, mock_chat_id, dto)
            ).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.LAST_READ_MESSAGE_NOT_IN_CHAT)
            );
        });

        it('should handle marking messages up to last_read_message_id', async () => {
            const dto: MarkMessagesReadDto = { last_read_message_id: 'message-123' };
            const mock_query_builder = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 3 }),
            };

            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.findOne.mockResolvedValue(mock_message as any);
            message_repository.createQueryBuilder.mockReturnValue(mock_query_builder as any);
            message_repository.count.mockResolvedValue(0);
            chat_repository.updateChat.mockResolvedValue(mock_chat as any);

            const result = await service.markMessagesAsRead(mock_user_id, mock_chat_id, dto);

            expect(mock_query_builder.andWhere).toHaveBeenCalledWith('created_at <= :created_at', {
                created_at: mock_message.created_at,
            });
            expect(result.messages_marked_read).toBe(3);
        });

        it('should update unread_count_user1 when user1 marks messages', async () => {
            const dto: MarkMessagesReadDto = {};
            const mock_query_builder = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 2 }),
            };

            chat_repository.findOne.mockResolvedValue(mock_chat as any);
            message_repository.createQueryBuilder.mockReturnValue(mock_query_builder as any);
            message_repository.count.mockResolvedValue(5);
            chat_repository.updateChat.mockResolvedValue(mock_chat as any);

            await service.markMessagesAsRead(mock_user_id, mock_chat_id, dto);

            expect(chat_repository.updateChat).toHaveBeenCalledWith(mock_chat_id, {
                unread_count_user1: 5,
            });
        });

        it('should update unread_count_user2 when user2 marks messages', async () => {
            const dto: MarkMessagesReadDto = {};
            const chat = { ...mock_chat, user1_id: mock_recipient_id, user2_id: mock_user_id };
            const mock_query_builder = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 2 }),
            };

            chat_repository.findOne.mockResolvedValue(chat as any);
            message_repository.createQueryBuilder.mockReturnValue(mock_query_builder as any);
            message_repository.count.mockResolvedValue(3);
            chat_repository.updateChat.mockResolvedValue(chat as any);

            await service.markMessagesAsRead(mock_user_id, mock_chat_id, dto);

            expect(chat_repository.updateChat).toHaveBeenCalledWith(mock_chat_id, {
                unread_count_user2: 3,
            });
        });
    });
});
