import { Test, TestingModule } from '@nestjs/testing';
import { ExploreService } from './explore.service';
import { RedisService } from '../redis/redis.service';
import { Repository } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { UserInterests } from '../user/entities/user-interests.entity';
import { TweetsService } from '../tweets/tweets.service';
import { TrendService } from '../trend/trend.service';
import { WhoToFollowService } from './who-to-follow.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRepository } from '../user/user.repository';

describe('ExploreService', () => {
    let service: ExploreService;
    let redis_service: RedisService;
    let category_repository: Repository<Category>;
    let user_interests_repository: Repository<UserInterests>;
    let user_repository: UserRepository;
    let tweets_service: TweetsService;
    let trend_service: TrendService;
    let who_to_follow_service: WhoToFollowService;

    const mock_redis_service = {
        zrevrange: jest.fn(),
        zrevrangeMultiple: jest.fn(),
    };

    const mock_category_repository = {
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mock_category_query_builder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    };

    // Ensure category repository supports createQueryBuilder in tests
    mock_category_repository['createQueryBuilder'] = jest.fn(() => mock_category_query_builder);

    const mock_user_interests_repository = {
        createQueryBuilder: jest.fn(),
    };

    const mock_user_repository = {
        createQueryBuilder: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            setParameter: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
        })),
    };

    const mock_tweets_service = {
        getTweetsByIds: jest.fn(),
    };

    const mock_trend_service = {
        getTrending: jest.fn(),
    };

    const mock_who_to_follow_service = {
        getWhoToFollow: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreService,
                { provide: RedisService, useValue: mock_redis_service },
                { provide: getRepositoryToken(Category), useValue: mock_category_repository },
                {
                    provide: getRepositoryToken(UserInterests),
                    useValue: mock_user_interests_repository,
                },
                { provide: UserRepository, useValue: mock_user_repository },
                { provide: TweetsService, useValue: mock_tweets_service },
                { provide: TrendService, useValue: mock_trend_service },
                { provide: WhoToFollowService, useValue: mock_who_to_follow_service },
            ],
        }).compile();

        service = module.get<ExploreService>(ExploreService);
        redis_service = module.get<RedisService>(RedisService);
        category_repository = module.get<Repository<Category>>(getRepositoryToken(Category));
        user_interests_repository = module.get<Repository<UserInterests>>(
            getRepositoryToken(UserInterests)
        );
        user_repository = module.get<UserRepository>(UserRepository);
        tweets_service = module.get<TweetsService>(TweetsService);
        trend_service = module.get<TrendService>(TrendService);
        who_to_follow_service = module.get<WhoToFollowService>(WhoToFollowService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getExploreData', () => {
        it('should return trending, who to follow, and for you posts', async () => {
            const mock_trending = ['topic1', 'topic2'];
            const mock_who_to_follow: any[] = [];
            const mock_for_you = [{ category: { id: 1 }, tweets: [] as any[] }];

            jest.spyOn(trend_service, 'getTrending').mockResolvedValue(mock_trending as any);
            jest.spyOn(who_to_follow_service, 'getWhoToFollow').mockResolvedValue(
                mock_who_to_follow
            );
            jest.spyOn(service, 'getForYouPosts').mockResolvedValue(mock_for_you as any);

            const result = await service.getExploreData('user-123');

            expect(result).toEqual({
                trending: mock_trending,
                who_to_follow: mock_who_to_follow,
                for_you: mock_for_you,
            });
            expect(trend_service.getTrending).toHaveBeenCalledWith('global', 5);
            expect(who_to_follow_service.getWhoToFollow).toHaveBeenCalledWith('user-123', 30);
            expect(service.getForYouPosts).toHaveBeenCalledWith('user-123');
        });

        it('should work without current user id', async () => {
            jest.spyOn(trend_service, 'getTrending').mockResolvedValue([] as any);
            jest.spyOn(who_to_follow_service, 'getWhoToFollow').mockResolvedValue([]);
            jest.spyOn(service, 'getForYouPosts').mockResolvedValue([]);

            const result = await service.getExploreData();

            expect(result).toBeDefined();
            expect(who_to_follow_service.getWhoToFollow).toHaveBeenCalledWith(undefined, 30);
            expect(service.getForYouPosts).toHaveBeenCalledWith(undefined);
        });
    });

    describe('getWhoToFollow', () => {
        it('should return 30 random users with relationships when user is logged in', async () => {
            const mock_result = [
                {
                    id: 'user-1',
                    username: 'john_doe',
                    name: 'John Doe',
                    bio: 'Software Engineer',
                    avatar_url: 'https://example.com/avatar1.jpg',
                    verified: true,
                    followers: 100,
                    following: 50,
                    is_following: true,
                    is_followed: false,
                },
                {
                    id: 'user-2',
                    username: 'jane_smith',
                    name: 'Jane Smith',
                    bio: 'Designer',
                    avatar_url: 'https://example.com/avatar2.jpg',
                    verified: false,
                    followers: 200,
                    following: 150,
                    is_following: false,
                    is_followed: true,
                },
            ];

            mock_who_to_follow_service.getWhoToFollow.mockResolvedValue(mock_result);

            const result = await service.getWhoToFollow('current-user-id');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 'user-1',
                username: 'john_doe',
                name: 'John Doe',
                bio: 'Software Engineer',
                avatar_url: 'https://example.com/avatar1.jpg',
                verified: true,
                followers: 100,
                following: 50,
                is_following: true,
                is_followed: false,
            });
            expect(mock_who_to_follow_service.getWhoToFollow).toHaveBeenCalledWith(
                'current-user-id',
                30
            );
        });

        it('should return users without relationship data when no user is logged in', async () => {
            const mock_result = [
                {
                    id: 'user-1',
                    username: 'john_doe',
                    name: 'John Doe',
                    bio: 'Software Engineer',
                    avatar_url: 'https://example.com/avatar1.jpg',
                    verified: true,
                    followers: 100,
                    following: 50,
                    is_following: false,
                    is_followed: false,
                },
            ];

            mock_who_to_follow_service.getWhoToFollow.mockResolvedValue(mock_result);

            const result = await service.getWhoToFollow();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 'user-1',
                username: 'john_doe',
                name: 'John Doe',
                bio: 'Software Engineer',
                avatar_url: 'https://example.com/avatar1.jpg',
                verified: true,
                followers: 100,
                following: 50,
                is_following: false,
                is_followed: false,
            });
            expect(mock_who_to_follow_service.getWhoToFollow).toHaveBeenCalledWith(undefined, 30);
        });

        it('should handle users with null values', async () => {
            const mock_result = [
                {
                    id: 'user-1',
                    username: 'john_doe',
                    name: 'John Doe',
                    bio: '',
                    avatar_url: '',
                    verified: false,
                    followers: 0,
                    following: 0,
                    is_following: false,
                    is_followed: false,
                },
            ];

            mock_who_to_follow_service.getWhoToFollow.mockResolvedValue(mock_result);

            const result = await service.getWhoToFollow();

            expect(result[0]).toEqual({
                id: 'user-1',
                username: 'john_doe',
                name: 'John Doe',
                bio: '',
                avatar_url: '',
                verified: false,
                followers: 0,
                following: 0,
                is_following: false,
                is_followed: false,
            });
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

            mock_category_repository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getCategoryTrending(category_id, 'user-123', 1, 20);

            expect(result.category).toEqual({ id: 21, name: 'Sports' });
            expect(result.tweets).toEqual(mock_tweets);
            expect(result.pagination?.page).toBe(1);
            expect(result.pagination?.hasMore).toBe(false);
        });

        it('should return null category when category does not exist', async () => {
            mock_category_repository.findOne.mockResolvedValue(null);

            const result = await service.getCategoryTrending('999', 'user-123');

            expect(result.category).toBeNull();
            expect(result.tweets).toEqual([]);
            expect(result.hasMore).toBe(false);
        });

        it('should handle pagination correctly with more results', async () => {
            const mock_category = { id: 21, name: 'Sports' };
            const mock_tweet_ids = Array.from({ length: 21 }, (_, i) => `tweet-${i + 1}`);

            mock_category_repository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(
                mock_tweet_ids.slice(0, 20) as any
            );

            const result = await service.getCategoryTrending('21', undefined, 1, 20);

            expect(result.pagination?.hasMore).toBe(true);
            expect(result.tweets).toHaveLength(20);
        });

        it('should return empty tweets when no trending tweets found', async () => {
            const mock_category = { id: 21, name: 'Sports' };

            mock_category_repository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue([]);

            const result = await service.getCategoryTrending('21', 'user-123');

            expect(result.category).toEqual({ id: 21, name: 'Sports' });
            expect(result.tweets).toEqual([]);
            expect(result.hasMore).toBe(false);
        });

        it('should handle page 2 correctly', async () => {
            const mock_category = { id: 21, name: 'Sports' };
            const mock_tweet_ids = ['tweet-21', 'tweet-22'];

            mock_category_repository.findOne.mockResolvedValue(mock_category);
            jest.spyOn(service, 'getTrendingWithOffset').mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweet_ids as any);

            const result = await service.getCategoryTrending('21', 'user-123', 2, 20);

            expect(service.getTrendingWithOffset).toHaveBeenCalledWith('21', 20, 21);
            expect(result.pagination?.page).toBe(2);
        });
    });

    describe('getTrendingWithOffset', () => {
        it('should call redis zrevrange with correct parameters', async () => {
            const category_id = '21';
            const offset = 0;
            const limit = 20;
            const mock_tweet_ids = ['tweet-1', 'tweet-2'];

            mock_redis_service.zrevrange.mockResolvedValue(mock_tweet_ids);

            const result = await service.getTrendingWithOffset(category_id, offset, limit);

            expect(mock_redis_service.zrevrange).toHaveBeenCalledWith(
                'explore:category:21',
                offset,
                limit
            );
            expect(result).toEqual(mock_tweet_ids);
        });

        it('should handle empty results from redis', async () => {
            mock_redis_service.zrevrange.mockResolvedValue([]);

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

            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_interests),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getForYouPosts(user_id);

            expect(result).toHaveLength(2);
            expect(result[0].category).toEqual({ name: 'Sports', id: 21 });
            expect(result[0].tweets).toHaveLength(2);
            expect(result[1].category).toEqual({ name: 'Tech', id: 20 });
        });

        it('should use default categories when user has no interests', async () => {
            const mock_default_cats = [
                { id: 2, name: 'Category2' },
                { id: 3, name: 'Category3' },
                { id: 5, name: 'Category5' },
                { id: 4, name: 'Category4' },
                { id: 15, name: 'Category15' },
            ];
            const mock_tweet_ids = [['tweet-1'], ['tweet-2'], [], [], []];
            const mock_tweets = [
                { tweet_id: 'tweet-1', content: 'test1' },
                { tweet_id: 'tweet-2', content: 'test2' },
            ];

            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_category_query_builder.getMany.mockResolvedValue(mock_default_cats);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getForYouPosts('user-456');

            expect(mock_category_query_builder.getMany).toHaveBeenCalled();
            expect(mock_category_query_builder.where).toHaveBeenCalledWith('c.id IN (:...ids)', {
                ids: [2, 3, 5, 4, 15],
            });
            expect(result).toHaveLength(2);
        });

        it('should fill remaining slots with default categories when user has partial interests', async () => {
            const user_id = 'user-789';
            const mock_interests = [
                { category: { id: 21, name: 'Sports' }, score: 100 },
                { category: { id: 20, name: 'Tech' }, score: 90 },
            ];
            const mock_default_cats = [
                { id: 2, name: 'Category2' },
                { id: 3, name: 'Category3' },
                { id: 5, name: 'Category5' },
            ];
            const mock_tweet_ids = [
                ['tweet-1'],
                ['tweet-2'],
                ['tweet-3'],
                ['tweet-4'],
                ['tweet-5'],
            ];
            const mock_tweets = [
                { tweet_id: 'tweet-1', content: 'test1' },
                { tweet_id: 'tweet-2', content: 'test2' },
                { tweet_id: 'tweet-3', content: 'test3' },
                { tweet_id: 'tweet-4', content: 'test4' },
                { tweet_id: 'tweet-5', content: 'test5' },
            ];

            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_interests),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_category_query_builder.getMany.mockResolvedValue(mock_default_cats);
            mock_category_query_builder.andWhere.mockReturnThis();
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getForYouPosts(user_id);

            // Should call andWhere because existing_ids.length > 0
            expect(mock_category_query_builder.andWhere).toHaveBeenCalledWith(
                'c.id NOT IN (:...existing_ids)',
                { existing_ids: [21, 20] }
            );
            expect(mock_category_query_builder.limit).toHaveBeenCalledWith(3); // needed = 5 - 2
            expect(result.length).toBeGreaterThan(0);
        });

        it('should NOT call andWhere when user has zero interests (existing_ids.length === 0)', async () => {
            const user_id = 'user-no-interests';
            const mock_default_cats = [
                { id: 2, name: 'Category2' },
                { id: 3, name: 'Category3' },
                { id: 5, name: 'Category5' },
                { id: 4, name: 'Category4' },
                { id: 15, name: 'Category15' },
            ];
            const mock_tweet_ids = [['tweet-1'], [], [], [], []];
            const mock_tweets = [{ tweet_id: 'tweet-1', content: 'test1' }];

            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_category_query_builder.andWhere.mockClear();
            mock_category_query_builder.getMany.mockResolvedValue(mock_default_cats);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweets);

            await service.getForYouPosts(user_id);

            // andWhere should NOT be called because existing_ids.length === 0
            expect(mock_category_query_builder.andWhere).not.toHaveBeenCalled();
            expect(mock_category_query_builder.limit).toHaveBeenCalledWith(5); // needed = 5 - 0
        });

        it('should use default categories when no user_id provided', async () => {
            const mock_default_cats = [
                { id: 2, name: 'Category2' },
                { id: 3, name: 'Category3' },
                { id: 5, name: 'Category5' },
                { id: 4, name: 'Category4' },
                { id: 15, name: 'Category15' },
            ];
            const mock_tweet_ids = [['tweet-1'], [], [], [], []];

            mock_category_query_builder.getMany.mockResolvedValue(mock_default_cats);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue([{ tweet_id: 'tweet-1' }]);

            const result = await service.getForYouPosts();

            expect(mock_category_query_builder.getMany).toHaveBeenCalled();
            expect(mock_category_query_builder.andWhere).not.toHaveBeenCalled();
        });

        it('should return empty array when no tweets found', async () => {
            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_category_repository.find.mockResolvedValue([{ id: 21, name: 'Sports' }]);
            mock_category_query_builder.getMany.mockResolvedValue([{ id: 21, name: 'Sports' }]);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue([[]]);

            const result = await service.getForYouPosts('user-123');

            expect(result).toEqual([]);
        });

        it('should skip categories with no tweets', async () => {
            const mock_interests = [
                { category: { id: 21, name: 'Sports' }, score: 100 },
                { category: { id: 20, name: 'Tech' }, score: 90 },
            ];
            const mock_tweet_ids = [['tweet-1'], []];

            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_interests),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue([{ tweet_id: 'tweet-1' }]);

            const result = await service.getForYouPosts('user-123');

            expect(result).toHaveLength(1);
            expect(result[0].category.id).toBe(21);
        });

        it('should handle user with exactly 5 interests (no default categories needed)', async () => {
            const user_id = 'user-full-interests';
            const mock_interests = [
                { category: { id: 21, name: 'Sports' }, score: 100 },
                { category: { id: 20, name: 'Tech' }, score: 90 },
                { category: { id: 19, name: 'Music' }, score: 80 },
                { category: { id: 18, name: 'Gaming' }, score: 70 },
                { category: { id: 17, name: 'News' }, score: 60 },
            ];
            const mock_tweet_ids = [
                ['tweet-1'],
                ['tweet-2'],
                ['tweet-3'],
                ['tweet-4'],
                ['tweet-5'],
            ];
            const mock_tweets = [
                { tweet_id: 'tweet-1', content: 'test1' },
                { tweet_id: 'tweet-2', content: 'test2' },
                { tweet_id: 'tweet-3', content: 'test3' },
                { tweet_id: 'tweet-4', content: 'test4' },
                { tweet_id: 'tweet-5', content: 'test5' },
            ];

            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_interests),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getForYouPosts(user_id);

            // Should NOT call category_repository because categories.length === 5
            expect(mock_category_query_builder.getMany).not.toHaveBeenCalled();
            expect(result).toHaveLength(5);
        });

        it('should handle multiple tweets in feed_structure correctly', async () => {
            const user_id = 'user-multi-tweets';
            const mock_interests = [
                { category: { id: 21, name: 'Sports' }, score: 100 },
                { category: { id: 20, name: 'Tech' }, score: 90 },
            ];
            const mock_tweet_ids = [
                ['tweet-1', 'tweet-2', 'tweet-3'],
                ['tweet-4', 'tweet-5'],
            ];
            const mock_tweets = [
                { tweet_id: 'tweet-1', content: 'test1' },
                { tweet_id: 'tweet-2', content: 'test2' },
                { tweet_id: 'tweet-3', content: 'test3' },
                { tweet_id: 'tweet-4', content: 'test4' },
                { tweet_id: 'tweet-5', content: 'test5' },
            ];

            const mock_query_builder = {
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_interests),
            };

            mock_user_interests_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_redis_service.zrevrangeMultiple.mockResolvedValue(mock_tweet_ids);
            mock_tweets_service.getTweetsByIds.mockResolvedValue(mock_tweets);

            const result = await service.getForYouPosts(user_id);

            expect(result).toHaveLength(2);
            expect(result[0].tweets).toHaveLength(3);
            expect(result[1].tweets).toHaveLength(2);
            expect(mock_tweets_service.getTweetsByIds).toHaveBeenCalledWith(
                expect.arrayContaining(['tweet-1', 'tweet-2', 'tweet-3', 'tweet-4', 'tweet-5']),
                user_id
            );
        });
    });
});
