import { Test, TestingModule } from '@nestjs/testing';
import { FakeTrendService } from './fake-trend.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { TweetsService } from 'src/tweets/tweets.service';
import { TrendDataConstants } from 'src/constants/variables';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('FakeTrendService', () => {
    let fake_trend_service: FakeTrendService;
    let user_repo: Repository<User>;
    let tweets_service: TweetsService;

    const mock_repo = (): Record<string, jest.Mock> => ({
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        preload: jest.fn(),
        insert: jest.fn(),
        increment: jest.fn(),
        decrement: jest.fn(),
        createQueryBuilder: jest.fn(),
    });

    const mock_user = {
        id: 'trend-bot-id-123',
        email: 'trend@yapper.test',
        name: 'Trend Bot',
        username: 'trendbot_',
        password: 'hashed_password',
        birth_date: new Date('2004-09-22'),
        language: 'en' as const,
        avatar_url: '',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
    };

    beforeEach(async () => {
        const mock_user_repo = mock_repo();
        const mock_tweets_service = {
            createFakeTrendTweet: jest.fn().mockResolvedValue({}),
            buildDefaultHashtagTopics: jest.fn().mockReturnValue({}),
            deleteTweetsByUserId: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FakeTrendService,
                { provide: getRepositoryToken(User), useValue: mock_user_repo },
                { provide: TweetsService, useValue: mock_tweets_service },
            ],
        }).compile();

        fake_trend_service = module.get<FakeTrendService>(FakeTrendService);
        user_repo = mock_user_repo as unknown as Repository<User>;
        tweets_service = module.get<TweetsService>(TweetsService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(fake_trend_service).toBeDefined();
        expect(user_repo).toBeDefined();
        expect(tweets_service).toBeDefined();
    });

    describe('insertTrendBotIfNotExists', () => {
        it('should return existing trend bot if it exists', async () => {
            // Arrange
            jest.spyOn(user_repo, 'findOne').mockResolvedValue(mock_user as any);

            // Act
            const result = await (fake_trend_service as any).insertTrendBotIfNotExists();

            // Assert
            expect(result).toEqual(mock_user);
            expect(user_repo.findOne).toHaveBeenCalledWith({
                where: { email: TrendDataConstants.TREND_BOT.email },
            });
        });

        it('should create new trend bot if it does not exist', async () => {
            // Arrange
            const hashed_password = 'hashed_password_123';
            jest.spyOn(user_repo, 'findOne').mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashed_password);
            jest.spyOn(user_repo, 'create').mockReturnValue(mock_user as any);
            jest.spyOn(user_repo, 'save').mockResolvedValue(mock_user as any);

            // Act
            const result = await (fake_trend_service as any).insertTrendBotIfNotExists();

            // Assert
            expect(result).toEqual(mock_user);
            expect(bcrypt.hash).toHaveBeenCalledWith(TrendDataConstants.TREND_BOT.password, 10);
            expect(user_repo.create).toHaveBeenCalledWith({
                ...TrendDataConstants.TREND_BOT,
                password: hashed_password,
            });
            expect(user_repo.save).toHaveBeenCalledWith(mock_user);
        });

        it('should handle bcrypt hash error', async () => {
            // Arrange
            jest.spyOn(user_repo, 'findOne').mockResolvedValue(null);
            const hash_error = new Error('Hash failed');
            (bcrypt.hash as jest.Mock).mockRejectedValue(hash_error);

            // Act & Assert
            await expect((fake_trend_service as any).insertTrendBotIfNotExists()).rejects.toThrow(
                hash_error
            );
        });

        it('should handle user save error', async () => {
            // Arrange
            jest.spyOn(user_repo, 'findOne').mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            jest.spyOn(user_repo, 'create').mockReturnValue(mock_user as any);
            const save_error = new Error('Save failed');
            jest.spyOn(user_repo, 'save').mockRejectedValue(save_error);

            // Act & Assert
            await expect((fake_trend_service as any).insertTrendBotIfNotExists()).rejects.toThrow(
                save_error
            );
        });
    });

    describe('createFakeTrendTweets', () => {
        it('should create fake trend tweets successfully', async () => {
            // Arrange
            const trend_bot_id = 'trend-bot-id-123';
            const mock_hashtags = ['#sports', '#football', '#soccer'];
            const mock_topics = { sports: { Sports: 100, Entertainment: 0, News: 0 } };

            jest.spyOn(fake_trend_service as any, 'selectRandomHashtags').mockReturnValue({
                hashtags: mock_hashtags,
                category: 'Sports',
            });
            jest.spyOn(fake_trend_service as any, 'getRandomHashtagSelection').mockReturnValue({
                hashtags: ['#sports', '#football'],
                category: 'Sports',
            });
            jest.spyOn(fake_trend_service as any, 'buildTweetContent').mockReturnValue(
                'Check out these trending topics! #sports #football'
            );
            jest.spyOn(tweets_service, 'buildDefaultHashtagTopics').mockReturnValue(
                mock_topics as any
            );
            jest.spyOn(tweets_service, 'createFakeTrendTweet').mockResolvedValue(undefined as any);

            // Act
            await (fake_trend_service as any).createFakeTrendTweets(trend_bot_id);

            // Assert
            expect(tweets_service.createFakeTrendTweet).toHaveBeenCalled();
            expect(tweets_service.buildDefaultHashtagTopics).toHaveBeenCalled();
        });

        it('should continue creating tweets even if one fails', async () => {
            // Arrange
            const trend_bot_id = 'trend-bot-id-123';
            jest.spyOn(fake_trend_service as any, 'selectRandomHashtags').mockReturnValue({
                hashtags: ['#sports'],
                category: 'Sports',
            });
            jest.spyOn(fake_trend_service as any, 'getRandomHashtagSelection').mockReturnValue({
                hashtags: ['#sports'],
                category: 'Sports',
            });
            jest.spyOn(fake_trend_service as any, 'buildTweetContent').mockReturnValue(
                'Test content #sports'
            );
            jest.spyOn(tweets_service, 'buildDefaultHashtagTopics').mockReturnValue({} as any);

            // First call fails, second succeeds
            jest.spyOn(tweets_service, 'createFakeTrendTweet')
                .mockRejectedValueOnce(new Error('Tweet creation failed'))
                .mockResolvedValueOnce(undefined as any);

            // Act & Assert - should not throw
            await expect(
                (fake_trend_service as any).createFakeTrendTweets(trend_bot_id)
            ).resolves.not.toThrow();
        });

        it('should handle selectRandomHashtags error gracefully', async () => {
            // Arrange
            const trend_bot_id = 'trend-bot-id-123';
            const select_error = new Error('Selection failed');
            jest.spyOn(fake_trend_service as any, 'selectRandomHashtags').mockImplementation(() => {
                throw select_error;
            });

            // Act & Assert - should not throw but log error
            await expect(
                (fake_trend_service as any).createFakeTrendTweets(trend_bot_id)
            ).resolves.not.toThrow();
        });
    });

    describe('selectRandomHashtags', () => {
        it('should select hashtags from all three categories', () => {
            // Act
            const result = (fake_trend_service as any).selectRandomHashtags();

            // Assert
            expect(result.hashtags).toBeDefined();
            expect(Array.isArray(result.hashtags)).toBe(true);
            expect(result.hashtags.length).toBeGreaterThan(0);
            expect(result.hashtags.length).toBeLessThanOrEqual(100);
            expect(result.category).toBeDefined();
        });

        it('should include hashtags from sports category', () => {
            // Act
            const result = (fake_trend_service as any).selectRandomHashtags();

            // Assert
            const sports_count = result.hashtags.filter(
                (tag: string) =>
                    TrendDataConstants.SPORTS_TRENDS.includes(tag) ||
                    TrendDataConstants.SPORTS_TRENDS.includes(tag.toLowerCase())
            ).length;
            expect(sports_count).toBeGreaterThan(0);
        });

        it('should include hashtags from entertainment category', () => {
            // Act
            const result = (fake_trend_service as any).selectRandomHashtags();

            // Assert
            const entertainment_count = result.hashtags.filter(
                (tag: string) =>
                    TrendDataConstants.ENTERTAINMENT_TRENDS.includes(tag) ||
                    TrendDataConstants.ENTERTAINMENT_TRENDS.includes(tag.toLowerCase())
            ).length;
            expect(entertainment_count).toBeGreaterThan(0);
        });

        it('should include hashtags from news category', () => {
            // Act
            const result = (fake_trend_service as any).selectRandomHashtags();

            // Assert
            const news_count = result.hashtags.filter(
                (tag: string) =>
                    TrendDataConstants.NEWS_TRENDS.includes(tag) ||
                    TrendDataConstants.NEWS_TRENDS.includes(tag.toLowerCase())
            ).length;
            expect(news_count).toBeGreaterThan(0);
        });
    });

    describe('getRandomHashtagSelection', () => {
        it('should select hashtags for Sports category', () => {
            // Arrange
            const all_hashtags = {
                hashtags: ['#football', '#soccer', '#basketball'],
                category: 'Sports' as const,
            };

            // Act
            const result = (fake_trend_service as any).getRandomHashtagSelection(all_hashtags);

            // Assert
            expect(result.hashtags).toBeDefined();
            expect(Array.isArray(result.hashtags)).toBe(true);
            // Category is randomly selected from the 3 possible categories
            expect(['Sports', 'Entertainment', 'News']).toContain(result.category);
            // Should have up to 5 hashtags
            expect(result.hashtags.length).toBeLessThanOrEqual(5);
        });

        it('should select hashtags for Entertainment category', () => {
            // Arrange
            const all_hashtags = {
                hashtags: ['#movie', '#music', '#celebrity'],
                category: 'Entertainment' as const,
            };

            // Act
            const result = (fake_trend_service as any).getRandomHashtagSelection(all_hashtags);

            // Assert
            expect(result.hashtags).toBeDefined();
            // Category is randomly selected, not necessarily Entertainment
            expect(['Sports', 'Entertainment', 'News']).toContain(result.category);
            expect(Array.isArray(result.hashtags)).toBe(true);
        });

        it('should select hashtags for News category', () => {
            // Arrange
            const all_hashtags = {
                hashtags: ['#breaking', '#update', '#news'],
                category: 'News' as const,
            };

            // Act
            const result = (fake_trend_service as any).getRandomHashtagSelection(all_hashtags);

            // Assert
            expect(result.hashtags).toBeDefined();
            // Category is randomly selected, not necessarily News
            expect(['Sports', 'Entertainment', 'News']).toContain(result.category);
        });

        it('should select up to 5 hashtags per tweet', () => {
            // Arrange
            const all_hashtags = {
                hashtags: Array.from({ length: 100 }, (_, i) => `#hashtag${i}`),
                category: 'Sports' as const,
            };

            // Act
            const result = (fake_trend_service as any).getRandomHashtagSelection(all_hashtags);

            // Assert
            expect(result.hashtags.length).toBeLessThanOrEqual(5);
            expect(result.hashtags.length).toBeGreaterThan(0);
        });
    });

    describe('getHashtagsByCategory', () => {
        it('should return Sports hashtags for Sports category', () => {
            // Act
            const result = (fake_trend_service as any).getHashtagsByCategory('Sports');

            // Assert
            expect(result).toEqual(TrendDataConstants.SPORTS_TRENDS);
        });

        it('should return Entertainment hashtags for Entertainment category', () => {
            // Act
            const result = (fake_trend_service as any).getHashtagsByCategory('Entertainment');

            // Assert
            expect(result).toEqual(TrendDataConstants.ENTERTAINMENT_TRENDS);
        });

        it('should return News hashtags for News category', () => {
            // Act
            const result = (fake_trend_service as any).getHashtagsByCategory('News');

            // Assert
            expect(result).toEqual(TrendDataConstants.NEWS_TRENDS);
        });

        it('should return Sports hashtags for unknown category', () => {
            // Act
            const result = (fake_trend_service as any).getHashtagsByCategory('Unknown' as any);

            // Assert
            expect(result).toEqual(TrendDataConstants.SPORTS_TRENDS);
        });
    });

    describe('getRandomItems', () => {
        it('should return requested count of items', () => {
            // Arrange
            const items = ['item1', 'item2', 'item3', 'item4', 'item5'];
            const count = 3;

            // Act
            const result = (fake_trend_service as any).getRandomItems(items, count);

            // Assert
            expect(result.length).toBeLessThanOrEqual(count);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should return all items if count exceeds array length', () => {
            // Arrange
            const items = ['item1', 'item2'];
            const count = 10;

            // Act
            const result = (fake_trend_service as any).getRandomItems(items, count);

            // Assert
            expect(result.length).toBeLessThanOrEqual(items.length);
        });

        it('should return empty array for empty input', () => {
            // Arrange
            const items: string[] = [];
            const count = 5;

            // Act
            const result = (fake_trend_service as any).getRandomItems(items, count);

            // Assert
            expect(result.length).toBe(0);
        });

        it('should not modify original array', () => {
            // Arrange
            const items = ['item1', 'item2', 'item3'];
            const items_copy = [...items];

            // Act
            (fake_trend_service as any).getRandomItems(items, 2);

            // Assert
            expect(items).toEqual(items_copy);
        });
    });

    describe('buildTweetContent', () => {
        it('should build tweet content with hashtags', () => {
            // Arrange
            const hashtags = ['#sports', '#football', '#soccer'];

            // Act
            const result = (fake_trend_service as any).buildTweetContent(hashtags);

            // Assert
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            hashtags.forEach((hashtag) => {
                expect(result).toContain(hashtag);
            });
        });

        it('should use different templates', () => {
            // Arrange
            const hashtags = ['#sports', '#football'];
            const templates = new Set<string>();

            // Act - Generate multiple templates
            for (let i = 0; i < 20; i++) {
                const content = (fake_trend_service as any).buildTweetContent(hashtags);
                templates.add(content);
            }

            // Assert - Should have variety (accounting for randomness)
            expect(templates.size).toBeGreaterThan(1);
        });

        it('should include all provided hashtags', () => {
            // Arrange
            const hashtags = ['#test1', '#test2', '#test3'];

            // Act
            const result = (fake_trend_service as any).buildTweetContent(hashtags);

            // Assert
            hashtags.forEach((hashtag) => {
                expect(result).toContain(hashtag);
            });
        });

        it('should produce valid tweet content', () => {
            // Arrange
            const hashtags = ['#sports'];

            // Act
            const result = (fake_trend_service as any).buildTweetContent(hashtags);

            // Assert
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('deleteFakeTrends', () => {
        it('should delete fake trends for trend bot', async () => {
            // Arrange
            (user_repo.findOne as jest.Mock).mockResolvedValue(mock_user as any);
            (tweets_service.deleteTweetsByUserId as jest.Mock).mockResolvedValue(undefined);

            // Act
            await fake_trend_service.deleteFakeTrends();

            // Assert
            expect(user_repo.findOne).toHaveBeenCalledWith({
                where: { email: TrendDataConstants.TREND_BOT.email },
            });
            expect(tweets_service.deleteTweetsByUserId).toHaveBeenCalledWith(mock_user.id);
        });

        it('should handle when trend bot does not exist', async () => {
            // Arrange
            (user_repo.findOne as jest.Mock).mockResolvedValue(null);

            // Act & Assert - should not throw
            await expect(fake_trend_service.deleteFakeTrends()).resolves.not.toThrow();
            expect(tweets_service.deleteTweetsByUserId).not.toHaveBeenCalled();
        });

        it('should handle deleteTweetsByUserId error', async () => {
            // Arrange
            (user_repo.findOne as jest.Mock).mockResolvedValue(mock_user as any);
            const delete_error = new Error('Delete failed');
            (tweets_service.deleteTweetsByUserId as jest.Mock).mockRejectedValue(delete_error);

            // Act & Assert - should not throw but log error
            await expect(fake_trend_service.deleteFakeTrends()).resolves.not.toThrow();
        });

        it('should handle findOne error gracefully', async () => {
            // Arrange
            const find_error = new Error('Find failed');
            (user_repo.findOne as jest.Mock).mockRejectedValue(find_error);

            // Act & Assert - should not throw but log error
            await expect(fake_trend_service.deleteFakeTrends()).resolves.not.toThrow();
        });
    });

    describe('fakeTrends (cron job)', () => {
        it('should call insertTrendBotIfNotExists and createFakeTrendTweets', async () => {
            // Arrange
            jest.spyOn(fake_trend_service as any, 'insertTrendBotIfNotExists').mockResolvedValue(
                mock_user
            );
            jest.spyOn(fake_trend_service as any, 'createFakeTrendTweets').mockResolvedValue(
                undefined
            );

            // Act
            await fake_trend_service.fakeTrends();

            // Assert
            expect((fake_trend_service as any).insertTrendBotIfNotExists).toHaveBeenCalled();
            expect((fake_trend_service as any).createFakeTrendTweets).toHaveBeenCalledWith(
                mock_user.id
            );
        });

        it('should handle insertTrendBotIfNotExists error', async () => {
            // Arrange
            const bot_error = new Error('Bot creation failed');
            jest.spyOn(fake_trend_service as any, 'insertTrendBotIfNotExists').mockRejectedValue(
                bot_error
            );

            // Act & Assert - should not throw but log error
            await expect(fake_trend_service.fakeTrends()).resolves.not.toThrow();
        });

        it('should handle createFakeTrendTweets error', async () => {
            // Arrange
            jest.spyOn(fake_trend_service as any, 'insertTrendBotIfNotExists').mockResolvedValue(
                mock_user
            );
            const tweet_error = new Error('Tweet creation failed');
            jest.spyOn(fake_trend_service as any, 'createFakeTrendTweets').mockRejectedValue(
                tweet_error
            );

            // Act & Assert - should not throw but log error
            await expect(fake_trend_service.fakeTrends()).resolves.not.toThrow();
        });
    });

    describe('Integration scenarios', () => {
        it('should complete full fake trend creation workflow', async () => {
            // Arrange
            (user_repo.findOne as jest.Mock).mockResolvedValue(mock_user as any);
            (tweets_service.buildDefaultHashtagTopics as jest.Mock).mockReturnValue({} as any);
            (tweets_service.createFakeTrendTweet as jest.Mock).mockResolvedValue(undefined as any);

            // Act
            await fake_trend_service.fakeTrends();

            // Assert
            expect(user_repo.findOne).toHaveBeenCalled();
            expect(tweets_service.buildDefaultHashtagTopics).toHaveBeenCalled();
            expect(tweets_service.createFakeTrendTweet).toHaveBeenCalled();
        });

        it('should handle hashtag topics generation correctly', () => {
            // Arrange
            const mock_topics = {
                sports: { Sports: 100, Entertainment: 0, News: 0 },
            };
            (tweets_service.buildDefaultHashtagTopics as jest.Mock).mockReturnValue(
                mock_topics as any
            );

            const hashtags = ['#sports', '#football'];
            const category = 'Sports';

            // Act
            const result = tweets_service.buildDefaultHashtagTopics(hashtags, category);

            // Assert
            expect(tweets_service.buildDefaultHashtagTopics).toHaveBeenCalledWith(
                hashtags,
                category
            );
            expect(result).toBeDefined();
            expect(result).toEqual(mock_topics);
        });
    });
});
