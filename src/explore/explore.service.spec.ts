import { Test, TestingModule } from '@nestjs/testing';
import { ExploreService } from './explore.service';
import { RedisService } from '../redis/redis.service';
import { Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { UserInterests } from '../user/entities/user-interests.entity';
import { TweetsService } from '../tweets/tweets.service';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('ExploreService', () => {
    let service: ExploreService;
    let redis_service: RedisService;
    let category_repository: Repository<Category>;
    let user_interests_repository: Repository<UserInterests>;
    let tweets_service: TweetsService;

    const mockRedisService = {
        zrevrange: jest.fn(),
        zrevrangeMultiple: jest.fn(),
    };

    const mockCategoryRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockUserInterestsRepository = {
        createQueryBuilder: jest.fn(),
    };

    const mockTweetsService = {
        getTweetsByIds: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreService,
                { provide: RedisService, useValue: mockRedisService },
                { provide: getRepositoryToken(Category), useValue: mockCategoryRepository },
                {
                    provide: getRepositoryToken(UserInterests),
                    useValue: mockUserInterestsRepository,
                },
                { provide: TweetsService, useValue: mockTweetsService },
            ],
        }).compile();

        service = module.get<ExploreService>(ExploreService);
        redis_service = module.get<RedisService>(RedisService);
        category_repository = module.get<Repository<Category>>(getRepositoryToken(Category));
        user_interests_repository = module.get<Repository<UserInterests>>(
            getRepositoryToken(UserInterests)
        );
        tweets_service = module.get<TweetsService>(TweetsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getExploreData', () => {
        it('should return trending, who to follow, and for you posts', async () => {
            const mock_trending = ['topic1', 'topic2'];
            const mock_who_to_follow = [];
            const mock_for_you_posts = [{ category: { id: 1 }, tweets: [] }];

            jest.spyOn(service, 'getTrending').mockResolvedValue(mock_trending);
            jest.spyOn(service, 'getWhoToFollow').mockResolvedValue(mock_who_to_follow);
            jest.spyOn(service, 'getForYouPosts').mockResolvedValue(mock_for_you_posts as any);

            const result = await service.getExploreData('user-123');

            expect(result).toEqual({
                trending: mock_trending,
                who_to_follow: mock_who_to_follow,
                for_you_posts: mock_for_you_posts,
            });
            expect(service.getTrending).toHaveBeenCalled();
            expect(service.getWhoToFollow).toHaveBeenCalled();
            expect(service.getForYouPosts).toHaveBeenCalledWith('user-123');
        });

        it('should work without current user id', async () => {
            jest.spyOn(service, 'getTrending').mockResolvedValue([]);
            jest.spyOn(service, 'getWhoToFollow').mockResolvedValue([]);
            jest.spyOn(service, 'getForYouPosts').mockResolvedValue([]);

            const result = await service.getExploreData();

            expect(result).toBeDefined();
            expect(service.getForYouPosts).toHaveBeenCalledWith(undefined);
        });
    });

    describe('getTrending', () => {
        it('should return empty array for now', async () => {
            const result = await service.getTrending();
            expect(result).toEqual([]);
        });

        it('should accept category parameter', async () => {
            const result = await service.getTrending('sports');
            expect(result).toEqual([]);
        });

        it('should accept country parameter', async () => {
            const result = await service.getTrending('tech', 'US');
            expect(result).toEqual([]);
        });
    });

    describe('getWhoToFollow', () => {
        it('should return empty array for now', async () => {
            const result = await service.getWhoToFollow();
            expect(result).toEqual([]);
        });
    });

    describe('getCategoryTrending', () => {
        it('should return category with tweets when category exists', async () => {
            const category_id = '21';
            const mock_category = { id: 21, name: 'Sports' };
            const mock_tweet_ids = ['tweet-1', 'tweet-2', 'tweet-3'];
            const mock_tweets = [
                { tweet_id: 'tweet-1', content: 'test1' },
                { tweet_id: 'tweet-2', content: 'test2' },
                { tweet_id: 'tweet-3', content: 'test3' },
            ];

            mockCategoryRepository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue(mock_tweet_ids);
            mockTweetsService.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getCategoryTrending(category_id, 'user-123', 1, 20);

            expect(result.category).toEqual({ id: 21, name: 'Sports' });
            expect(result.tweets).toEqual(mock_tweets);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.hasMore).toBe(false);
        });

        it('should return null category when category does not exist', async () => {
            mockCategoryRepository.findOne.mockResolvedValue(null);

            const result = await service.getCategoryTrending('999', 'user-123');

            expect(result.category).toBeNull();
            expect(result.tweets).toEqual([]);
            expect(result.hasMore).toBe(false);
        });

        it('should handle pagination correctly with more results', async () => {
            const mock_category = { id: 21, name: 'Sports' };
            const mock_tweet_ids = Array.from({ length: 21 }, (_, i) => `tweet-${i + 1}`);

            mockCategoryRepository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue(mock_tweet_ids);
            mockTweetsService.getTweetsByIds.mockResolvedValue(mock_tweet_ids.slice(0, 20) as any);

            const result = await service.getCategoryTrending('21', undefined, 1, 20);

            expect(result.pagination.hasMore).toBe(true);
            expect(result.tweets).toHaveLength(20);
        });

        it('should return empty tweets when no trending tweets found', async () => {
            const mock_category = { id: 21, name: 'Sports' };

            mockCategoryRepository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue([]);

            const result = await service.getCategoryTrending('21', 'user-123');

            expect(result.category).toEqual({ id: 21, name: 'Sports' });
            expect(result.tweets).toEqual([]);
            expect(result.hasMore).toBe(false);
        });

        it('should handle page 2 correctly', async () => {
            const mock_category = { id: 21, name: 'Sports' };
            const mock_tweet_ids = ['tweet-21', 'tweet-22'];

            mockCategoryRepository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue(mock_tweet_ids);
            mockTweetsService.getTweetsByIds.mockResolvedValue(mock_tweet_ids as any);

            const result = await service.getCategoryTrending('21', 'user-123', 2, 20);

            expect(service.getTrendingWithOffset).toHaveBeenCalledWith('21', 20, 21);
            expect(result.pagination.page).toBe(2);
        });
    });

    describe('getTrendingWithOffset', () => {
        it('should call redis zrevrange with correct parameters', async () => {
            const category_id = '21';
            const offset = 0;
            const limit = 20;
            const mock_tweet_ids = ['tweet-1', 'tweet-2'];

            mockRedisService.zrevrange.mockResolvedValue(mock_tweet_ids);

            const result = await service.getTrendingWithOffset(category_id, offset, limit);

            expect(mockRedisService.zrevrange).toHaveBeenCalledWith(
                'trending:category:21',
                offset,
                limit
            );
            expect(result).toEqual(mock_tweet_ids);
        });

        it('should handle empty results from redis', async () => {
            mockRedisService.zrevrange.mockResolvedValue([]);

            const result = await service.getTrendingWithOffset('21', 0, 20);

            expect(result).toEqual([]);
        });
    });

    describe('getForYouPosts', () => {
        it('should return feed structure with user interests', async () => {
            const user_id = 'user-123';
            const mock_interests = [
                { category: { id: 21, name: 'Sports' }, score: 100 },
                { category: { id: 20, name: 'Tech' }, score: 90 },
            ];
            const mock_tweet_ids = [['tweet-1', 'tweet-2'], ['tweet-3']];
            const mock_tweets = [
                { tweet_id: 'tweet-1', content: 'test1' },
                { tweet_id: 'tweet-2', content: 'test2' },
                { tweet_id: 'tweet-3', content: 'test3' },
            ];

            const mockQueryBuilder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_interests),
            };

            mockUserInterestsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockRedisService.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mockTweetsService.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getForYouPosts(user_id);

            expect(result).toHaveLength(2);
            expect(result[0].category).toEqual({ name: 'Sports', id: 21 });
            expect(result[0].tweets).toHaveLength(2);
            expect(result[1].category).toEqual({ name: 'Tech', id: 20 });
        });

        it('should use default categories when user has no interests', async () => {
            const mock_default_cats = [
                { id: 21, name: 'Sports' },
                { id: 20, name: 'Tech' },
            ];
            const mock_tweet_ids = [['tweet-1'], ['tweet-2']];
            const mock_tweets = [
                { tweet_id: 'tweet-1', content: 'test1' },
                { tweet_id: 'tweet-2', content: 'test2' },
            ];

            const mockQueryBuilder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockUserInterestsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockCategoryRepository.find.mockResolvedValue(mock_default_cats);
            mockRedisService.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mockTweetsService.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getForYouPosts('user-456');

            expect(mockCategoryRepository.find).toHaveBeenCalled();
            expect(result).toHaveLength(2);
        });

        it('should use default categories when no user_id provided', async () => {
            const mock_default_cats = [{ id: 21, name: 'Sports' }];
            const mock_tweet_ids = [['tweet-1']];

            mockCategoryRepository.find.mockResolvedValue(mock_default_cats);
            mockRedisService.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mockTweetsService.getTweetsByIds.mockResolvedValue([{ tweet_id: 'tweet-1' }]);

            const result = await service.getForYouPosts();

            expect(mockCategoryRepository.find).toHaveBeenCalled();
        });

        it('should return empty array when no tweets found', async () => {
            const mockQueryBuilder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockUserInterestsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockCategoryRepository.find.mockResolvedValue([{ id: 21, name: 'Sports' }]);
            mockRedisService.zrevrangeMultiple.mockResolvedValue([[]]);

            const result = await service.getForYouPosts('user-123');

            expect(result).toEqual([]);
        });

        it('should skip categories with no tweets', async () => {
            const mock_interests = [
                { category: { id: 21, name: 'Sports' }, score: 100 },
                { category: { id: 20, name: 'Tech' }, score: 90 },
            ];
            const mock_tweet_ids = [['tweet-1'], []];

            const mockQueryBuilder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_interests),
            };

            mockUserInterestsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockRedisService.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mockTweetsService.getTweetsByIds.mockResolvedValue([{ tweet_id: 'tweet-1' }]);

            const result = await service.getForYouPosts('user-123');

            expect(result).toHaveLength(1);
            expect(result[0].category.id).toBe(21);
        });
    });
});
