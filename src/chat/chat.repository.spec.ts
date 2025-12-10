import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ChatRepository } from './chat.repository';
import { Chat } from './entities/chat.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateChatDto, GetChatsQueryDto } from './dto';
import { UserRepository } from 'src/user/user.repository';

describe('ChatRepository', () => {
    let chat_repository: ChatRepository;
    let pagination_service: jest.Mocked<PaginationService>;

    const mock_chat = {
        id: 'chat-123',
        user1_id: 'user-1',
        user2_id: 'user-2',
        created_at: new Date(),
        updated_at: new Date(),
        unread_count_user1: 0,
        unread_count_user2: 0,
        user1: {
            id: 'user-1',
            username: 'user1',
            name: 'User One',
            avatar_url: 'pic1.jpg',
        },
        user2: {
            id: 'user-2',
            username: 'user2',
            name: 'User Two',
            avatar_url: 'pic2.jpg',
        },
        last_message: null,
    };

    let mock_data_source: any;
    let mock_user_repository: any;

    beforeEach(async () => {
        const mock_entity_manager = {} as any;

        mock_user_repository = {
            findOne: jest.fn(),
            findById: jest.fn(),
        };

        mock_data_source = {
            createEntityManager: jest.fn(() => mock_entity_manager),
            getRepository: jest.fn(() => mock_user_repository),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatRepository,
                {
                    provide: DataSource,
                    useValue: mock_data_source,
                },
                {
                    provide: PaginationService,
                    useValue: {
                        applyCursorPagination: jest.fn(),
                        generateNextCursor: jest.fn(),
                    },
                },
                {
                    provide: UserRepository,
                    useValue: mock_user_repository,
                },
            ],
        }).compile();

        chat_repository = module.get<ChatRepository>(ChatRepository);
        pagination_service = module.get(PaginationService);

        // Mock base repository methods
        jest.spyOn(chat_repository, 'findOne').mockResolvedValue(null);
        jest.spyOn(chat_repository, 'create').mockReturnValue(mock_chat as any);
        jest.spyOn(chat_repository, 'save').mockResolvedValue(mock_chat as any);
        jest.spyOn(chat_repository, 'update').mockResolvedValue({ affected: 1 } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createChat', () => {
        it('should create a new chat successfully', async () => {
            const create_dto: CreateChatDto = { recipient_id: 'user-2' };

            // Mock user repository to find recipient
            mock_user_repository.findById.mockResolvedValue({ id: 'user-2', username: 'user2' });

            jest.spyOn(chat_repository, 'findOne').mockResolvedValue(null);

            const result = await chat_repository.createChat('user-1', create_dto);

            expect(chat_repository.create).toHaveBeenCalledWith({
                user1_id: 'user-1',
                user2_id: 'user-2',
            });
            expect(chat_repository.save).toHaveBeenCalled();
            expect(result).toEqual(mock_chat);
        });

        it('should return existing chat if it exists', async () => {
            const create_dto: CreateChatDto = { recipient_id: 'user-2' };

            // Mock user repository to find recipient
            mock_user_repository.findById.mockResolvedValue({ id: 'user-2', username: 'user2' });

            jest.spyOn(chat_repository, 'findOne').mockResolvedValue(mock_chat as any);

            const result = await chat_repository.createChat('user-1', create_dto);

            expect(result).toEqual(mock_chat);
            expect(chat_repository.create).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException if recipient does not exist', async () => {
            const create_dto: CreateChatDto = { recipient_id: 'non-existent-user' };

            // Mock user repository to not find recipient
            mock_user_repository.findById.mockResolvedValue(null);

            await expect(chat_repository.createChat('user-1', create_dto)).rejects.toThrow(
                NotFoundException
            );
        });

        it('should throw InternalServerErrorException on error', async () => {
            const create_dto: CreateChatDto = { recipient_id: 'user-2' };

            // Mock user repository to throw error
            mock_user_repository.findById.mockRejectedValue(new Error('DB error'));

            await expect(chat_repository.createChat('user-1', create_dto)).rejects.toThrow(
                InternalServerErrorException
            );
        });
    });

    describe('findChat', () => {
        it('should find chat between two users', async () => {
            jest.spyOn(chat_repository, 'findOne').mockResolvedValue(mock_chat as any);

            const result = await chat_repository.findChat('user-1', 'user-2');

            expect(chat_repository.findOne).toHaveBeenCalledWith({
                where: [
                    { user1_id: 'user-1', user2_id: 'user-2' },
                    { user1_id: 'user-2', user2_id: 'user-1' },
                ],
            });
            expect(result).toEqual(mock_chat);
        });

        it('should return null if chat not found', async () => {
            jest.spyOn(chat_repository, 'findOne').mockResolvedValue(null);

            const result = await chat_repository.findChat('user-1', 'user-3');

            expect(result).toBeNull();
        });
    });

    describe('findChatById', () => {
        it('should find chat by ID', async () => {
            jest.spyOn(chat_repository, 'findOne').mockResolvedValue(mock_chat as any);

            const result = await chat_repository.findChatById('chat-123');

            expect(chat_repository.findOne).toHaveBeenCalledWith({
                where: { id: 'chat-123' },
            });
            expect(result).toEqual(mock_chat);
        });

        it('should return null if chat not found', async () => {
            jest.spyOn(chat_repository, 'findOne').mockResolvedValue(null);

            const result = await chat_repository.findChatById('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('getChats', () => {
        it('should get chats with pagination for user1', async () => {
            const query: GetChatsQueryDto = {
                limit: 20,
                cursor: undefined,
            };

            const mock_query_builder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_chat]),
            };

            jest.spyOn(chat_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await chat_repository.getChats('user-1', query);

            expect(mock_query_builder.leftJoinAndSelect).toHaveBeenCalledWith(
                'chat.user1',
                'user1'
            );
            expect(mock_query_builder.leftJoinAndSelect).toHaveBeenCalledWith(
                'chat.user2',
                'user2'
            );
            expect(mock_query_builder.where).toHaveBeenCalled();
            expect(mock_query_builder.orderBy).toHaveBeenCalledWith(
                'last_message.created_at',
                'DESC',
                'NULLS LAST'
            );
            expect(result.data).toHaveLength(1);
            expect(result.next_cursor).toBeNull();
        });

        it('should get chats for user2 perspective', async () => {
            const query: GetChatsQueryDto = {
                limit: 10,
            };

            const mock_query_builder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mock_chat]),
            };

            jest.spyOn(chat_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );
            pagination_service.generateNextCursor.mockReturnValue(null);

            const result = await chat_repository.getChats('user-2', query);

            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toBeDefined();
            expect(result.data[0].unread_count).toBe(mock_chat.unread_count_user2);
        });

        it('should apply cursor pagination when cursor is provided', async () => {
            const query: GetChatsQueryDto = {
                limit: 15,
                cursor: '2024-01-01T00:00:00.000Z_chat-123',
            };

            const mock_query_builder_with_and = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(chat_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder_with_and as any
            );
            pagination_service.generateNextCursor.mockReturnValue(null);

            const result = await chat_repository.getChats('user-1', query);

            expect(mock_query_builder_with_and.andWhere).toHaveBeenCalled();
            expect(result.data).toHaveLength(0);
        });

        it('should throw InternalServerErrorException on database error', async () => {
            const query: GetChatsQueryDto = { limit: 20 };

            jest.spyOn(chat_repository, 'createQueryBuilder').mockImplementation(() => {
                throw new Error('Database error');
            });

            await expect(chat_repository.getChats('user-1', query)).rejects.toThrow(
                InternalServerErrorException
            );
        });
    });

    describe('updateChat', () => {
        it('should update chat successfully', async () => {
            const update_data = { unread_count_user1: 5 };
            jest.spyOn(chat_repository, 'update').mockResolvedValue({ affected: 1 } as any);
            jest.spyOn(chat_repository, 'findOne').mockResolvedValue({
                ...mock_chat,
                ...update_data,
            } as any);

            const result = await chat_repository.updateChat('chat-123', update_data);

            expect(chat_repository.update).toHaveBeenCalledWith('chat-123', update_data);
            expect(result).toHaveProperty('unread_count_user1', 5);
        });

        it('should throw InternalServerErrorException if chat not found after update', async () => {
            jest.spyOn(chat_repository, 'update').mockResolvedValue({ affected: 1 } as any);
            jest.spyOn(chat_repository, 'findOne').mockResolvedValue(null);

            await expect(chat_repository.updateChat('non-existent-id', {})).rejects.toThrow(
                InternalServerErrorException
            );
        });

        it('should throw InternalServerErrorException on error', async () => {
            jest.spyOn(chat_repository, 'update').mockRejectedValue(new Error('DB error'));

            await expect(chat_repository.updateChat('chat-123', {})).rejects.toThrow(
                InternalServerErrorException
            );
        });
    });
});
