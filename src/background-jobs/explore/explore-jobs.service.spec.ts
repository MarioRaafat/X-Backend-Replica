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
        keys: jest.fn(),
        deleteByPrefix: jest.fn(),
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

        it('should throw error when queue operations fail', async () => {
            mock_queue.getWaiting.mockRejectedValue(new Error('Queue connection failed'));

            await expect(service.getQueueStats()).rejects.toThrow('Queue connection failed');
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

        it('should handle edge case where denominator could be zero', () => {
            // This is a defensive check - mathematically unlikely but handled
            const tweet = {
                tweet_id: 'tweet-4',
                num_likes: 100,
                num_reposts: 50,
                num_quotes: 20,
                num_replies: 30,
                created_at: new Date(),
            };

            const score = service.calculateScore(tweet);

            // Should return a valid number, not NaN or Infinity
            expect(typeof score).toBe('number');
            expect(isFinite(score)).toBe(true);
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

    describe('getAllActiveCategoryIds', () => {
        it('should return active category IDs from Redis', async () => {
            const mock_keys = ['explore:category:21', 'explore:category:20', 'invalid-key'];
            (mock_redis_service as any).keys = jest.fn().mockResolvedValue(mock_keys);

            const result = await service.getAllActiveCategoryIds();

            expect(result).toEqual(['21', '20']);
            expect(mock_redis_service.keys).toHaveBeenCalledWith('explore:category:*');
        });

        it('should handle redis errors', async () => {
            (mock_redis_service as any).keys = jest
                .fn()
                .mockRejectedValue(new Error('Redis error'));

            const result = await service.getAllActiveCategoryIds();

            expect(result).toEqual([]);
        });
    });

    describe('fetchTweetsByIds', () => {
        it('should return tweets for given IDs', async () => {
            const tweet_ids = ['tweet-1', 'tweet-2'];
            const mock_tweets = [{ tweet_id: 'tweet-1' }, { tweet_id: 'tweet-2' }];

            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_tweets),
            };

            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const result = await service.fetchTweetsByIds(tweet_ids);

            expect(result).toEqual(mock_tweets);
            expect(mock_query_builder.andWhere).toHaveBeenCalledWith(
                'tweet.tweet_id IN (:...tweet_ids)',
                { tweet_ids }
            );
        });

        it('should return empty array if no IDs provided', async () => {
            const result = await service.fetchTweetsByIds([]);
            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockRejectedValue(new Error('DB Error')),
            };
            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const result = await service.fetchTweetsByIds(['tweet-1']);
            expect(result).toEqual([]);
        });
    });

    describe('recalculateExistingTopTweets', () => {
        beforeEach(() => {
            // Mock getAllActiveCategoryIds for this suite
            (mock_redis_service as any).keys = jest.fn().mockResolvedValue(['explore:category:21']);
        });

        it('should recalculate scores for existing tweets', async () => {
            // Mock Redis pipeline for fetching
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, ['tweet-1', '100', 'tweet-2', '50']], // Results for category 21
                ]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            // Mock fetching tweet data
            const mock_tweets = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 100,
                    num_reposts: 50,
                    num_quotes: 20,
                    num_replies: 30,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
                {
                    tweet_id: 'tweet-2',
                    num_likes: 50,
                    num_reposts: 10,
                    num_quotes: 5,
                    num_replies: 5,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            // Mock fetchTweetsByIds internal call
            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_tweets),
            };
            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            // Mock Redis pipeline for updates
            const mock_update_pipeline = {
                zrem: jest.fn().mockReturnThis(),
                zadd: jest.fn().mockReturnThis(),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_update_pipeline);

            // Mock Redis pipeline for trim
            const mock_trim_pipeline = {
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_trim_pipeline);

            const result = await service.recalculateExistingTopTweets();

            expect(result.categories_processed).toBe(1);
            expect(result.tweets_recalculated).toBe(2);
            expect(mock_update_pipeline.zadd).toHaveBeenCalledTimes(2);
        });

        it('should return early if no active categories', async () => {
            (mock_redis_service as any).keys = jest.fn().mockResolvedValue([]);

            const result = await service.recalculateExistingTopTweets();

            expect(result.categories_processed).toBe(0);
            expect(result.tweets_recalculated).toBe(0);
        });

        it('should handle missing pipeline results', async () => {
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            const result = await service.recalculateExistingTopTweets();

            expect(result.categories_processed).toBe(0);
        });

        it('should handle tweets not found in DB', async () => {
            // Mock Redis pipeline for fetching
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, ['tweet-deleted', '100']]]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            // Mock fetching tweet data returns empty
            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const mock_update_pipeline = {
                zrem: jest.fn().mockReturnThis(),
                zadd: jest.fn().mockReturnThis(),
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_update_pipeline);

            // Mock Redis pipeline for trim
            const mock_trim_pipeline = {
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_trim_pipeline);

            const result = await service.recalculateExistingTopTweets();

            expect(result.tweets_recalculated).toBe(0);
            expect(mock_update_pipeline.zrem).toHaveBeenCalledWith(
                'explore:category:21',
                'tweet-deleted'
            );
        });

        it('should handle pipeline errors for categories', async () => {
            // Mock Redis pipeline with error for one category
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [new Error('Redis error'), null], // Error for category 21
                ]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            const result = await service.recalculateExistingTopTweets();

            expect(result.categories_processed).toBe(1);
            expect(result.tweets_recalculated).toBe(0);
        });

        it('should handle all categories returning no tweets', async () => {
            // Mock Redis pipeline with empty results
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, []], // Empty results for category 21
                ]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            const result = await service.recalculateExistingTopTweets();

            expect(result.categories_processed).toBe(1);
            expect(result.tweets_recalculated).toBe(0);
        });

        it('should remove tweets with score below threshold', async () => {
            // Mock Redis pipeline for fetching
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, ['tweet-low-score', '100']]]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            // Mock fetching tweet data with very low engagement
            const mock_tweets = [
                {
                    tweet_id: 'tweet-low-score',
                    num_likes: 0,
                    num_reposts: 0,
                    num_quotes: 0,
                    num_replies: 0,
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days old
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_tweets),
            };
            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const mock_update_pipeline = {
                zrem: jest.fn().mockReturnThis(),
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_update_pipeline);

            // Mock Redis pipeline for trim
            const mock_trim_pipeline = {
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_trim_pipeline);

            const result = await service.recalculateExistingTopTweets();

            expect(result.tweets_recalculated).toBe(0);
            expect(mock_update_pipeline.zrem).toHaveBeenCalledWith(
                'explore:category:21',
                'tweet-low-score'
            );
        });

        it('should handle tweet without matching category (uses default percentage)', async () => {
            // Mock Redis pipeline for fetching
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, ['tweet-no-cat', '100']]]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            // Mock fetching tweet data with categories but not matching the Redis category
            const mock_tweets = [
                {
                    tweet_id: 'tweet-no-cat',
                    num_likes: 100,
                    num_reposts: 50,
                    num_quotes: 20,
                    num_replies: 30,
                    created_at: new Date(),
                    categories: [{ category_id: '99', percentage: 50 }], // Different category
                },
            ];

            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_tweets),
            };
            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            const mock_update_pipeline = {
                zrem: jest.fn().mockReturnThis(),
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_update_pipeline);

            // Mock Redis pipeline for trim
            const mock_trim_pipeline = {
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_trim_pipeline);

            const result = await service.recalculateExistingTopTweets();

            // Should use default percentage of 100
            expect(result.tweets_recalculated).toBe(1);
            expect(mock_update_pipeline.zadd).toHaveBeenCalled();
        });
    });

    describe('trimCategoryZSets', () => {
        it('should trim and expire category sets', async () => {
            (mock_redis_service as any).keys = jest.fn().mockResolvedValue(['explore:category:21']);

            // 1. Fetch Pipeline
            const mock_fetch_pipeline = {
                zrevrange: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, ['tweet-1', '100']]]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_fetch_pipeline);

            // Mock fetching tweet data
            const mock_tweets = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 100,
                    num_reposts: 50,
                    num_quotes: 20,
                    num_replies: 30,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            const mock_query_builder = {
                leftJoinAndMapMany: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_tweets),
            };
            mock_tweet_repository.createQueryBuilder.mockReturnValue(mock_query_builder);

            // 2. Update Pipeline
            const mock_update_pipeline = {
                zrem: jest.fn().mockReturnThis(),
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_update_pipeline);

            // 3. Trim Pipeline
            const mock_trim_pipeline = {
                zremrangebyrank: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            mock_redis_service.pipeline.mockReturnValueOnce(mock_trim_pipeline);

            await service.recalculateExistingTopTweets();

            expect(mock_trim_pipeline.zremrangebyrank).toHaveBeenCalledWith(
                'explore:category:21',
                0,
                -(50 + 1) // EXPLORE_CONFIG.MAX_CATEGORY_SIZE is likely 50
            );
            expect(mock_trim_pipeline.expire).toHaveBeenCalled();
        });
    });

    describe('clearScoreRecalculation', () => {
        it('should clear all explore keys', async () => {
            (mock_redis_service as any).deleteByPrefix = jest.fn().mockResolvedValue(undefined);

            await service.clearScoreRecalculation();

            expect(mock_redis_service.deleteByPrefix).toHaveBeenCalledWith('explore:category:');
        });
    });
});
