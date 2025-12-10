import { Test, TestingModule } from '@nestjs/testing';
import { ExploreJobsService } from './explore-jobs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Tweet } from '../../tweets/entities/tweet.entity';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_NAMES } from '../constants/queue.constants';

describe('ExploreJobsService', () => {
    let service: ExploreJobsService;
    let tweet_repository: Repository<Tweet>;
    let redis_service: RedisService;
    let explore_queue: any;

    const mock_tweet_repository = {
        createQueryBuilder: jest.fn(),
    };

    const mock_redis_service = {
        pipeline: jest.fn(),
    };

    const mock_queue = {
        add: jest.fn(),
        getWaiting: jest.fn(),
        getActive: jest.fn(),
        getCompleted: jest.fn(),
        getFailed: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreJobsService,
                { provide: getRepositoryToken(Tweet), useValue: mock_tweet_repository },
                { provide: RedisService, useValue: mock_redis_service },
                { provide: getQueueToken(QUEUE_NAMES.EXPLORE), useValue: mock_queue },
            ],
        }).compile();

        service = module.get<ExploreJobsService>(ExploreJobsService);
        tweet_repository = module.get<Repository<Tweet>>(getRepositoryToken(Tweet));
        redis_service = module.get<RedisService>(RedisService);
        explore_queue = module.get(getQueueToken(QUEUE_NAMES.EXPLORE));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('triggerScoreRecalculation', () => {
        it('should trigger score recalculation successfully', async () => {
            const mock_job = { id: '123' };
            mock_queue.add.mockResolvedValue(mock_job);

            const job_data = {
                since_hours: 24,
                max_age_hours: 168,
                batch_size: 100,
                force_all: false,
            };

            const result = await service.triggerScoreRecalculation(job_data, 1);

            expect(result.success).toBe(true);
            expect(result.job_id).toBe('123');
            expect(result.params).toEqual(job_data);
            expect(mock_queue.add).toHaveBeenCalled();
        });

        it('should handle queue errors gracefully', async () => {
            mock_queue.add.mockRejectedValue(new Error('Queue unavailable'));

            const job_data = {
                since_hours: 24,
                max_age_hours: 168,
                batch_size: 100,
                force_all: false,
            };

            const result = await service.triggerScoreRecalculation(job_data);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Queue unavailable');
        });
    });

    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            mock_queue.getWaiting.mockResolvedValue([1, 2]);
            mock_queue.getActive.mockResolvedValue([1]);
            mock_queue.getCompleted.mockResolvedValue([1, 2, 3]);
            mock_queue.getFailed.mockResolvedValue([]);

            const stats = await service.getQueueStats();

            expect(stats.waiting).toBe(2);
            expect(stats.active).toBe(1);
            expect(stats.completed).toBe(3);
            expect(stats.failed).toBe(0);
            expect(stats.total_jobs).toBe(6);
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
            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(42),
            };

            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const count = await service.countTweetsForRecalculation(24, 168, false);

            expect(count).toBe(42);
            expect(mock_query_builder.getCount).toHaveBeenCalled();
        });

        it('should handle force_all parameter', async () => {
            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(100),
            };

            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

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

            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_tweets),
            };

            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const tweets = await service.fetchTweetsForRecalculation(24, 168, false, 0, 100);

            expect(tweets).toEqual(mock_tweets);
            expect(mock_query_builder.skip).toHaveBeenCalledWith(0);
            expect(mock_query_builder.take).toHaveBeenCalledWith(100);
        });

        it('should handle empty results', async () => {
            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

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

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
            };

            mock_redis_service.pipeline.mockReturnValue(mock_pipeline);

            const categories_updated = await service.updateRedisCategoryScores(tweets);

            expect(categories_updated).toBe(2);
            expect(mock_pipeline.zadd).toHaveBeenCalledTimes(2);
            expect(mock_pipeline.exec).toHaveBeenCalled();
        });

        it('should skip tweets with score below threshold', async () => {
            const tweets = [
                {
                    tweet_id: 'tweet-1',
                    score: 0.001,
                    categories: [{ category_id: '21', percentage: 10 }],
                },
            ];

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
            };

            mock_redis_service.pipeline.mockReturnValue(mock_pipeline);

            await service.updateRedisCategoryScores(tweets);

            expect(mock_pipeline.zadd).not.toHaveBeenCalled();
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

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
            };

            mock_redis_service.pipeline.mockReturnValue(mock_pipeline);

            const categories_updated = await service.updateRedisCategoryScores(tweets);

            expect(categories_updated).toBe(1);
        });
    });
});
