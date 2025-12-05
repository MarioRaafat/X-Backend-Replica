import { Test, TestingModule } from '@nestjs/testing';
import { MessageRepository } from './messages.repository';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PaginationService } from '../shared/services/pagination/pagination.service';
import { Message, MessageType } from './entities/message.entity';
import { Chat } from '../chat/entities/chat.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/swagger-messages';

describe('MessageRepository', () => {
    let repository: MessageRepository;
    let data_source: jest.Mocked<DataSource>;
    let pagination_service: jest.Mocked<PaginationService>;
    let chat_repository: jest.Mocked<Repository<Chat>>;

    const mock_message_id = 'message-123';
    const mock_chat_id = 'chat-456';
    const mock_sender_id = 'user-789';

    const mock_message = {
        id: mock_message_id,
        chat_id: mock_chat_id,
        sender_id: mock_sender_id,
        content: 'Test message',
        message_type: MessageType.TEXT,
        is_read: false,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        sender: {
            id: mock_sender_id,
            username: 'testuser',
            name: 'Test User',
            avatar_url: 'avatar.jpg',
        },
    };

    beforeEach(async () => {
        chat_repository = {
            update: jest.fn(),
        } as any;

        data_source = {
            createEntityManager: jest.fn().mockReturnValue({
                getRepository: jest.fn(),
            }),
            getRepository: jest.fn().mockReturnValue(chat_repository),
        } as any;

        pagination_service = {
            applyCursorPagination: jest.fn(),
            generateNextCursor: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessageRepository,
                { provide: DataSource, useValue: data_source },
                { provide: PaginationService, useValue: pagination_service },
            ],
        }).compile();

        repository = module.get<MessageRepository>(MessageRepository);

        // Mock repository methods
        jest.spyOn(repository, 'create').mockReturnValue(mock_message as any);
        jest.spyOn(repository, 'save').mockResolvedValue(mock_message as any);
        jest.spyOn(repository, 'findOne').mockResolvedValue(mock_message as any);
        jest.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('createMessage', () => {
        it('should create and return a message with relations', async () => {
            const dto = {
                content: 'New message',
                message_type: MessageType.TEXT,
            };

            const result = await repository.createMessage(mock_sender_id, mock_chat_id, dto);

            expect(repository.create).toHaveBeenCalledWith({
                sender_id: mock_sender_id,
                chat_id: mock_chat_id,
                content: dto.content,
                message_type: dto.message_type,
                reply_to_message_id: null,
                is_read: false,
            });
            expect(repository.save).toHaveBeenCalled();
            expect(chat_repository.update).toHaveBeenCalledWith(
                { id: mock_chat_id },
                { last_message_id: mock_message_id }
            );
            expect(result).toEqual(mock_message);
        });

        it('should handle reply messages', async () => {
            const dto = {
                content: 'Reply message',
                message_type: MessageType.REPLY,
                reply_to_message_id: 'original-message-id',
            };

            await repository.createMessage(mock_sender_id, mock_chat_id, dto);

            expect(repository.create).toHaveBeenCalledWith({
                sender_id: mock_sender_id,
                chat_id: mock_chat_id,
                content: dto.content,
                message_type: dto.message_type,
                reply_to_message_id: dto.reply_to_message_id || null,
                is_read: false,
            });
        });

        it('should throw InternalServerErrorException if message retrieval fails', async () => {
            const dto = {
                content: 'New message',
                message_type: MessageType.TEXT,
            };

            jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

            await expect(
                repository.createMessage(mock_sender_id, mock_chat_id, dto)
            ).rejects.toThrow(InternalServerErrorException);
        });

        it('should throw InternalServerErrorException on save error', async () => {
            const dto = {
                content: 'New message',
                message_type: MessageType.TEXT,
            };

            jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error('Database error'));

            await expect(
                repository.createMessage(mock_sender_id, mock_chat_id, dto)
            ).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB)
            );
        });
    });

    describe('findMessagesByChatId', () => {
        it('should find messages by chat_id', async () => {
            const query = { limit: 50 };
            const messages = [mock_message];

            const mock_query_builder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(messages),
            };

            jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mock_query_builder as any);
            pagination_service.applyCursorPagination.mockReturnValue(mock_query_builder as any);

            const result = await repository.findMessagesByChatId(mock_chat_id, query);

            expect(mock_query_builder.where).toHaveBeenCalledWith('message.chat_id = :chat_id', {
                chat_id: mock_chat_id,
            });
            expect(mock_query_builder.take).toHaveBeenCalledWith(51);
            expect(result).toEqual(messages);
        });

        it('should handle pagination with before cursor', async () => {
            const query = { limit: 20, before: 'before-message-id' };
            const before_message = { ...mock_message, id: 'before-message-id' };

            const mock_query_builder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_message]),
            };

            jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mock_query_builder as any);
            jest.spyOn(repository, 'findOne').mockResolvedValueOnce(before_message as any);
            pagination_service.applyCursorPagination.mockReturnValue(mock_query_builder as any);

            await repository.findMessagesByChatId(mock_chat_id, query);

            expect(pagination_service.applyCursorPagination).toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException on query error', async () => {
            const query = { limit: 50 };

            jest.spyOn(repository, 'createQueryBuilder').mockImplementation(() => {
                throw new Error('Database error');
            });

            await expect(repository.findMessagesByChatId(mock_chat_id, query)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB)
            );
        });
    });

    describe('findMessageById', () => {
        it('should find a message by id', async () => {
            const result = await repository.findMessageById(mock_message_id);

            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: mock_message_id, is_deleted: false },
                relations: ['sender', 'chat', 'reply_to', 'reply_to.sender'],
            });
            expect(result).toEqual(mock_message);
        });

        it('should return null if message not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

            const result = await repository.findMessageById('non-existent-id');

            expect(result).toBeNull();
        });

        it('should throw InternalServerErrorException on query error', async () => {
            jest.spyOn(repository, 'findOne').mockRejectedValueOnce(new Error('Database error'));

            await expect(repository.findMessageById(mock_message_id)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB)
            );
        });
    });

    describe('updateMessageContent', () => {
        it('should update message content and mark as edited', async () => {
            const new_content = 'Updated content';
            const updated_message = { ...mock_message, content: new_content, is_edited: true };

            jest.spyOn(repository, 'findOne').mockResolvedValueOnce(updated_message as any);

            const result = await repository.updateMessageContent(mock_message_id, new_content);

            expect(repository.update).toHaveBeenCalledWith(
                { id: mock_message_id },
                {
                    content: new_content,
                    is_edited: true,
                }
            );
            expect(result.content).toBe(new_content);
            expect(result.is_edited).toBe(true);
        });

        it('should throw InternalServerErrorException if message retrieval fails', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

            await expect(
                repository.updateMessageContent(mock_message_id, 'Updated content')
            ).rejects.toThrow(InternalServerErrorException);
        });

        it('should throw InternalServerErrorException on update error', async () => {
            jest.spyOn(repository, 'update').mockRejectedValueOnce(new Error('Database error'));

            await expect(
                repository.updateMessageContent(mock_message_id, 'Updated content')
            ).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
            );
        });
    });

    describe('deleteMessage', () => {
        it('should soft delete a message', async () => {
            const deleted_message = {
                ...mock_message,
                is_deleted: true,
                deleted_at: expect.any(Date),
                content: 'This message was deleted',
            };

            jest.spyOn(repository, 'findOne').mockResolvedValueOnce(deleted_message as any);

            const result = await repository.deleteMessage(mock_message_id);

            expect(repository.update).toHaveBeenCalledWith(
                { id: mock_message_id },
                {
                    is_deleted: true,
                    deleted_at: expect.any(Date),
                    content: 'This message was deleted',
                }
            );
            expect(result.is_deleted).toBe(true);
        });

        it('should throw InternalServerErrorException if message retrieval fails', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

            await expect(repository.deleteMessage(mock_message_id)).rejects.toThrow(
                InternalServerErrorException
            );
        });

        it('should throw InternalServerErrorException on delete error', async () => {
            jest.spyOn(repository, 'update').mockRejectedValueOnce(new Error('Database error'));

            await expect(repository.deleteMessage(mock_message_id)).rejects.toThrow(
                new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB)
            );
        });
    });
});
