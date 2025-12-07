import { Test, TestingModule } from '@nestjs/testing';
import { ExploreJobsService } from './explore-jobs.service';
import { getQueueToken } from '@nestjs/bull';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tweet } from '../../tweets/entities/tweet.entity';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_NAMES } from '../constants/queue.constants';

describe('ExploreJobsService', () => {
    let service: ExploreJobsService;
    let explore_queue: any;
    let tweet_repository: Repository<Tweet>;
    let redis_service: RedisService;

    const mockQueue = {
        add: jest.fn(),
    };

    const mockTweetRepository = {
        createQueryBuilder: jest.fn(),
    };

    const mockRedisService = {
        pipeline: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreJobsService,
                { provide: getQueueToken(QUEUE_NAMES.EXPLORE), useValue: mockQueue },
                { provide: getRepositoryToken(Tweet), useValue: mockTweetRepository },
                { provide: RedisService, useValue: mockRedisService },
            ],
        }).compile();

        service = module.get<ExploreJobsService>(ExploreJobsService);
        explore_queue = module.get(getQueueToken(QUEUE_NAMES.EXPLORE));
        tweet_repository = module.get<Repository<Tweet>>(getRepositoryToken(Tweet));
        redis_service = module.get<RedisService>(RedisService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('triggerExploreScoreRecalculation', () => {
        it('should add recalculation job to queue with default parameters', async () => {
            mockQueue.add.mockResolvedValue({ id: '1' });

            await service.triggerExploreScoreRecalculation();

            expect(mockQueue.add).toHaveBeenCalledWith(
                'recalculate-explore-scores',
                {
                    since_hours: undefined,
                    max_age_hours: undefined,
                    force_all: false,
                },
                {
                    attempts: 3,
                    removeOnComplete: true,
                }
            );
        });

        it('should add recalculation job with custom parameters', async () => {
            mockQueue.add.mockResolvedValue({ id: '2' });

            await service.triggerExploreScoreRecalculation(24, 168, true);

            expect(mockQueue.add).toHaveBeenCalledWith(
                'recalculate-explore-scores',
                {
                    since_hours: 24,
                    max_age_hours: 168,
                    force_all: true,
                },
                expect.any(Object)
            );
        });

        it('should handle queue errors gracefully', async () => {
            mockQueue.add.mockRejectedValue(new Error('Queue error'));

            await expect(service.triggerExploreScoreRecalculation()).resolves.not.toThrow();
        });
    });

    describe('calculateScore', () => {
        it('should calculate score correctly for fresh tweet with high engagement', () => {
            const tweet = {
                tweet_id: 'tweet-1',
                num_likes: 100,
                num_reposts: 50,
                num_quotes: 20,
                num_replies: 30,
                created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            };

            const score = service.calculateScore(tweet);

            expect(score).toBeGreaterThan(0);
            expect(typeof score).toBe('number');
        });

        it('should calculate lower score for old tweet', () => {
            const fresh_tweet = {
                tweet_id: 'tweet-1',
                num_likes: 100,
                num_reposts: 50,
                num_quotes: 20,
                num_replies: 30,
                created_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            };

            const old_tweet = {
                ...fresh_tweet,
                created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
            };

            const fresh_score = service.calculateScore(fresh_tweet);
            const old_score = service.calculateScore(old_tweet);

            expect(fresh_score).toBeGreaterThan(old_score);
        });

        it('should return 0 for tweet with no engagement', () => {
            const tweet = {
                tweet_id: 'tweet-2',
                num_likes: 0,
                num_reposts: 0,
                num_quotes: 0,
                num_replies: 0,
                created_at: new Date(),
            };

            const score = service.calculateScore(tweet);

            expect(score).toBe(0);
        });

        it('should handle future dates (edge case)', () => {
            const tweet = {
                tweet_id: 'tweet-3',
                num_likes: 100,
                num_reposts: 50,
                num_quotes: 20,
                num_replies: 30,
                created_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in future
            };

            const score = service.calculateScore(tweet);

            expect(score).toBeGreaterThan(0);
            expect(typeof score).toBe('number');
        });
    });

    describe('countTweetsForRecalculation', () => {
        it('should count tweets correctly', async () => {
            const mockQueryBuilder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(42),
            };

            mockTweetRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const count = await service.countTweetsForRecalculation(24, 168, false);

            expect(count).toBe(42);
            expect(mockQueryBuilder.getCount).toHaveBeenCalled();
        });

        it('should handle force_all parameter', async () => {
            const mockQueryBuilder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(100),
            };

            mockTweetRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const count = await service.countTweetsForRecalculation(24, 168, true);

            expect(count).toBe(100);
        });
    });

    describe('fetchTweetsForRecalculation', () => {
        it('should fetch tweets with pagination', async () => {
            const mock_tweets = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 10,
                    num_reposts: 5,
                    num_quotes: 2,
                    num_replies: 3,
                    created_at: new Date(),
                },
            ];

            const mockQueryBuilder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_tweets),
            };

            mockTweetRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const tweets = await service.fetchTweetsForRecalculation(24, 168, false, 0, 100);

            expect(tweets).toEqual(mock_tweets);
            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
        });

        it('should handle empty results', async () => {
            const mockQueryBuilder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockTweetRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const tweets = await service.fetchTweetsForRecalculation(24, 168, false, 500, 100);

            expect(tweets).toEqual([]);
        });
    });

    describe('updateRedisCategoryScores', () => {
        it('should update Redis with tweet scores', async () => {
            const tweets = [
                {
                    tweet_id: 'tweet-1',
                    score: 100,
                    categories: [
                        { category_id: '21', percentage: 80 },
                        { category_id: '20', percentage: 20 },
                    ],
                },
            ];

            const mockPipeline = {
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
            };

            mockRedisService.pipeline.mockReturnValue(mockPipeline);

            const categories_updated = await service.updateRedisCategoryScores(tweets);

            expect(categories_updated).toBe(2);
            expect(mockPipeline.zadd).toHaveBeenCalledTimes(2);
            expect(mockPipeline.exec).toHaveBeenCalled();
        });

        it('should skip tweets with score below threshold', async () => {
            const tweets = [
                {
                    tweet_id: 'tweet-1',
                    score: 0.001,
                    categories: [{ category_id: '21', percentage: 10 }],
                },
            ];

            const mockPipeline = {
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
            };

            mockRedisService.pipeline.mockReturnValue(mockPipeline);

            await service.updateRedisCategoryScores(tweets);

            expect(mockPipeline.zadd).not.toHaveBeenCalled();
        });

        it('should return 0 when no tweets provided', async () => {
            const categories_updated = await service.updateRedisCategoryScores([]);

            expect(categories_updated).toBe(0);
        });

        it('should deduplicate categories', async () => {
            const tweets = [
                {
                    tweet_id: 'tweet-1',
                    score: 100,
                    categories: [{ category_id: '21', percentage: 100 }],
                },
                {
                    tweet_id: 'tweet-2',
                    score: 90,
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            const mockPipeline = {
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
            };

            mockRedisService.pipeline.mockReturnValue(mockPipeline);

            const categories_updated = await service.updateRedisCategoryScores(tweets);

            expect(categories_updated).toBe(1);
        });
    });
});
