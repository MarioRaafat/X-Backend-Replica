import { Test, TestingModule } from '@nestjs/testing';
import { MessageReactionRepository } from './message-reaction.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageReaction } from './entities/message-reaction.entity';
import { DeleteResult, Repository } from 'typeorm';

describe('MessageReactionRepository', () => {
    let repository: MessageReactionRepository;
    let typeorm_repository: jest.Mocked<Repository<MessageReaction>>;

    const mock_user_id = 'user-123';
    const mock_message_id = 'message-456';
    const mock_emoji = '❤️';

    const mock_reaction = {
        id: 'reaction-123',
        message_id: mock_message_id,
        user_id: mock_user_id,
        emoji: mock_emoji,
        created_at: new Date(),
        updated_at: new Date(),
        user: {
            id: mock_user_id,
            username: 'testuser',
            name: 'Test User',
            avatar_url: 'avatar.jpg',
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessageReactionRepository,
                {
                    provide: getRepositoryToken(MessageReaction),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                        delete: jest.fn(),
                        find: jest.fn(),
                    },
                },
            ],
        }).compile();

        repository = module.get<MessageReactionRepository>(MessageReactionRepository);
        typeorm_repository = module.get(getRepositoryToken(MessageReaction));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('addReaction', () => {
        it('should add a new reaction', async () => {
            typeorm_repository.findOne.mockResolvedValue(null);
            typeorm_repository.save.mockResolvedValue(mock_reaction as any);

            const result = await repository.addReaction(mock_message_id, mock_user_id, mock_emoji);

            expect(typeorm_repository.findOne).toHaveBeenCalledWith({
                where: { message_id: mock_message_id, user_id: mock_user_id },
            });
            expect(typeorm_repository.save).toHaveBeenCalledWith({
                message_id: mock_message_id,
                user_id: mock_user_id,
                emoji: mock_emoji,
            });
            expect(result).toEqual(mock_reaction);
        });

        it('should update existing reaction with new emoji', async () => {
            const existing_reaction = { ...mock_reaction };
            typeorm_repository.findOne.mockResolvedValue(existing_reaction as any);
            typeorm_repository.save.mockResolvedValue({
                ...existing_reaction,
                emoji: '👍',
            } as any);

            const result = await repository.addReaction(mock_message_id, mock_user_id, '👍');

            expect(typeorm_repository.findOne).toHaveBeenCalledWith({
                where: { message_id: mock_message_id, user_id: mock_user_id },
            });
            expect(typeorm_repository.save).toHaveBeenCalledWith({
                ...existing_reaction,
                emoji: '👍',
            });
            expect(result.emoji).toBe('👍');
        });
    });

    describe('removeReaction', () => {
        it('should remove a reaction successfully', async () => {
            typeorm_repository.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

            const result = await repository.removeReaction(mock_message_id, mock_user_id);

            expect(typeorm_repository.delete).toHaveBeenCalledWith({
                message_id: mock_message_id,
                user_id: mock_user_id,
            });
            expect(result).toBe(true);
        });

        it('should return false when reaction does not exist', async () => {
            typeorm_repository.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

            const result = await repository.removeReaction(mock_message_id, mock_user_id);

            expect(typeorm_repository.delete).toHaveBeenCalledWith({
                message_id: mock_message_id,
                user_id: mock_user_id,
            });
            expect(result).toBe(false);
        });

        it('should handle null affected value', async () => {
            typeorm_repository.delete.mockResolvedValue({ affected: null } as any);

            const result = await repository.removeReaction(mock_message_id, mock_user_id);

            expect(result).toBe(false);
        });
    });

    describe('getMessageReactions', () => {
        it('should return all reactions for a message', async () => {
            const mock_reactions = [
                mock_reaction,
                {
                    ...mock_reaction,
                    id: 'reaction-456',
                    user_id: 'user-456',
                    emoji: '👍',
                },
            ];
            typeorm_repository.find.mockResolvedValue(mock_reactions as any);

            const result = await repository.getMessageReactions(mock_message_id);

            expect(typeorm_repository.find).toHaveBeenCalledWith({
                where: { message_id: mock_message_id },
                relations: ['user'],
                order: { created_at: 'ASC' },
            });
            expect(result).toEqual(mock_reactions);
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no reactions exist', async () => {
            typeorm_repository.find.mockResolvedValue([]);

            const result = await repository.getMessageReactions(mock_message_id);

            expect(typeorm_repository.find).toHaveBeenCalledWith({
                where: { message_id: mock_message_id },
                relations: ['user'],
                order: { created_at: 'ASC' },
            });
            expect(result).toEqual([]);
        });

        it('should order reactions by created_at ascending', async () => {
            const mock_reactions = [
                { ...mock_reaction, created_at: new Date('2024-01-01') },
                { ...mock_reaction, created_at: new Date('2024-01-02') },
                { ...mock_reaction, created_at: new Date('2024-01-03') },
            ];
            typeorm_repository.find.mockResolvedValue(mock_reactions as any);

            await repository.getMessageReactions(mock_message_id);

            expect(typeorm_repository.find).toHaveBeenCalledWith({
                where: { message_id: mock_message_id },
                relations: ['user'],
                order: { created_at: 'ASC' },
            });
        });
    });

    describe('getReactionsByMessageIds', () => {
        it('should return reactions for a specific message ID', async () => {
            const mock_reactions = [mock_reaction];
            typeorm_repository.find.mockResolvedValue(mock_reactions as any);

            const result = await repository.getReactionsByMessageIds(mock_message_id);

            expect(typeorm_repository.find).toHaveBeenCalledWith({
                where: { message_id: mock_message_id },
                relations: ['user'],
            });
            expect(result).toEqual(mock_reactions);
        });

        it('should return empty array when no reactions exist for message', async () => {
            typeorm_repository.find.mockResolvedValue([]);

            const result = await repository.getReactionsByMessageIds(mock_message_id);

            expect(typeorm_repository.find).toHaveBeenCalledWith({
                where: { message_id: mock_message_id },
                relations: ['user'],
            });
            expect(result).toEqual([]);
        });

        it('should include user relations in response', async () => {
            const mock_reactions = [mock_reaction];
            typeorm_repository.find.mockResolvedValue(mock_reactions as any);

            const result = await repository.getReactionsByMessageIds(mock_message_id);

            expect(result[0].user).toBeDefined();
            expect(result[0].user.id).toBe(mock_user_id);
        });
    });
});
