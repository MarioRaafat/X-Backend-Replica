import { Test, TestingModule } from '@nestjs/testing';
import { TrendService } from './trend.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hashtag } from 'src/tweets/entities/hashtags.entity';
import { RedisService } from 'src/redis/redis.service';
import { VelocityExponentialDetector } from './velocity-exponential-detector';
import { HashtagJobDto } from 'src/background-jobs/hashtag/hashtag-job.dto';

describe('TrendService', () => {
    let trend_service: TrendService;
    let hashtag_repo: Repository<Hashtag>;
    let redis_service: RedisService;
    let velocity_calculator: VelocityExponentialDetector;

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

    beforeEach(async () => {
        const mock_hashtag_repo = mock_repo();

        const mock_redis_service = {
            zrevrange: jest.fn(),
            pipeline: jest.fn(),
            zadd: jest.fn(),
            expire: jest.fn(),
            zincrby: jest.fn(),
            zrangebyscore: jest.fn(),
            zscore: jest.fn(),
            del: jest.fn(),
        };

        const mock_velocity_calculator = {
            calculateFinalMomentum: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TrendService,
                { provide: getRepositoryToken(Hashtag), useValue: mock_hashtag_repo },
                { provide: RedisService, useValue: mock_redis_service },
                { provide: VelocityExponentialDetector, useValue: mock_velocity_calculator },
            ],
        }).compile();

        trend_service = module.get<TrendService>(TrendService);
        hashtag_repo = mock_hashtag_repo as unknown as Repository<Hashtag>;
        redis_service = module.get<RedisService>(RedisService);
        velocity_calculator = module.get<VelocityExponentialDetector>(VelocityExponentialDetector);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(trend_service).toBeDefined();
        expect(hashtag_repo).toBeDefined();
        expect(redis_service).toBeDefined();
        expect(velocity_calculator).toBeDefined();
    });

    describe('getTrending', () => {
        it('should return trending hashtags for global category', async () => {
            const mock_trending_data = [
                'javascript',
                '100.5',
                'typescript',
                '95.3',
                'nestjs',
                '89.2',
            ];
            const mock_hashtags = [
                { name: 'javascript', usage_count: 1500 },
                { name: 'typescript', usage_count: 1200 },
                { name: 'nestjs', usage_count: 980 },
            ];
            const mock_categories = {
                javascript: 'News',
                typescript: 'Entertainment',
                nestjs: 'Only on Yapper',
            };

            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue(mock_trending_data as any);
            jest.spyOn(hashtag_repo, 'find').mockResolvedValue(mock_hashtags as any);
            jest.spyOn(trend_service as any, 'getHashtagCategories').mockResolvedValue(
                mock_categories
            );

            const result = await trend_service.getTrending();

            expect(redis_service.zrevrange).toHaveBeenCalledWith(
                'trending:global',
                0,
                29,
                'WITHSCORES'
            );
            expect(hashtag_repo.find).toHaveBeenCalledWith({
                where: { name: expect.anything() },
                select: ['name', 'usage_count'],
            });
            expect(result).toHaveProperty('data');
            expect(result.data).toHaveLength(3);
            expect(result.data[0]).toHaveProperty('text', '#javascript');
            expect(result.data[0]).toHaveProperty('trend_rank', 1);
            expect(result.data[0]).toHaveProperty('posts_count', 1500);
            expect(result.data[0]).toHaveProperty('category', 'News');
            expect(result.data[0]).toHaveProperty('reference_id');
        });

        it('should return trending hashtags for specific category', async () => {
            const mock_trending_data = ['#sports', '98.5'];
            const mock_hashtags = [{ name: '#sports', usage_count: 2000 }];
            const mock_categories = { '#sports': 'Sports' };

            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue(mock_trending_data as any);
            jest.spyOn(hashtag_repo, 'find').mockResolvedValue(mock_hashtags as any);
            jest.spyOn(trend_service as any, 'getHashtagCategories').mockResolvedValue(
                mock_categories
            );

            const result = await trend_service.getTrending('Sports', 20);

            expect(redis_service.zrevrange).toHaveBeenCalledWith(
                'trending:Sports',
                0,
                19,
                'WITHSCORES'
            );
            expect(result.data).toHaveLength(1);
            expect(result.data[0].category).toBe('Sports');
        });

        it('should handle empty trending results', async () => {
            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue([]);
            jest.spyOn(hashtag_repo, 'find').mockResolvedValue([]);
            jest.spyOn(trend_service as any, 'getHashtagCategories').mockResolvedValue({});

            const result = await trend_service.getTrending();

            expect(result.data).toEqual([]);
        });

        it('should use default category when not found', async () => {
            const mock_trending_data = ['#unknown', '50'];
            const mock_hashtags = [{ name: '#unknown', usage_count: 100 }];
            const mock_categories = {}; // No category found

            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue(mock_trending_data as any);
            jest.spyOn(hashtag_repo, 'find').mockResolvedValue(mock_hashtags as any);
            jest.spyOn(trend_service as any, 'getHashtagCategories').mockResolvedValue(
                mock_categories
            );

            const result = await trend_service.getTrending();

            expect(result.data[0].category).toBe('Only on Yapper');
        });
    });

    describe('getHashtagCategories', () => {
        it('should return hashtag categories from redis', async () => {
            const hashtag_names = ['#sports', '#news'];
            // Results for #sports: [Sports: 80, News: null, Entertainment: null]
            // Results for #news: [Sports: null, News: null, Entertainment: 90]
            const mock_pipeline = {
                zscore: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, '80'], // #sports - Sports
                    [null, null], // #sports - News
                    [null, null], // #sports - Entertainment
                    [null, null], // #news - Sports
                    [null, null], // #news - News
                    [null, '90'], // #news - Entertainment
                ]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            const result = await trend_service.getHashtagCategories(hashtag_names);

            expect(result['#sports']).toBe('Sports');
            expect(result['#news']).toBe('Entertainment');
        });

        it('should return default category when pipeline fails', async () => {
            const hashtag_names = ['#test'];
            const mock_pipeline = {
                zscore: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            const result = await trend_service.getHashtagCategories(hashtag_names);

            expect(result['#test']).toBe('Only on Yapper');
        });
    });

    describe('insertCandidateHashtags', () => {
        it('should insert candidate hashtags to redis', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#trending': { Sports: 50, News: 30 },
                    '#viral': { Entertainment: 60 },
                },
                timestamp: Date.now(),
            };

            jest.spyOn(redis_service, 'zadd').mockResolvedValue(2 as any);
            jest.spyOn(redis_service, 'expire').mockResolvedValue(true as any);

            await trend_service.insertCandidateHashtags(hashtag_job);

            expect(redis_service.zadd).toHaveBeenCalled();
            expect(redis_service.zadd).toHaveBeenCalledWith(
                'candidates:active',
                expect.any(Number),
                expect.any(String),
                expect.any(Number),
                expect.any(String)
            );
            expect(redis_service.expire).toHaveBeenCalledWith('candidates:active', 6 * 60 * 60);
        });
    });

    describe('insertCandidateCategories', () => {
        it('should insert candidate categories to redis with threshold', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#trending': { Sports: 50, News: 20 },
                    '#viral': { Entertainment: 60 },
                },
                timestamp: Date.now(),
            };

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            await trend_service.insertCandidateCategories(hashtag_job);

            expect(mock_pipeline.zadd).toHaveBeenCalled();
            expect(mock_pipeline.expire).toHaveBeenCalled();
            expect(mock_pipeline.exec).toHaveBeenCalled();
        });

        it('should only insert hashtags that meet category threshold', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 25 }, // Below 30 threshold
                },
                timestamp: Date.now(),
            };

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            await trend_service.insertCandidateCategories(hashtag_job);

            expect(mock_pipeline.exec).toHaveBeenCalled();
        });
    });

    describe('updateHashtagCounts', () => {
        it('should update hashtag counts in redis', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#trending': { Sports: 50 },
                },
                timestamp: 1702862400000,
            };

            const mock_pipeline = {
                exec: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(redis_service, 'zincrby').mockResolvedValue(1 as any);
            jest.spyOn(redis_service, 'expire').mockResolvedValue(true as any);
            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            await trend_service.updateHashtagCounts(hashtag_job);

            expect(redis_service.zincrby).toHaveBeenCalled();
            expect(redis_service.expire).toHaveBeenCalledWith('hashtag:#trending', 6 * 60 * 60);
            expect(mock_pipeline.exec).toHaveBeenCalled();
        });
    });

    describe('calculateTrend', () => {
        it('should calculate and update trending lists', async () => {
            const mock_active_hashtags = ['#trending', '#viral'];
            const mock_score_data = {
                hashtag: '#trending',
                score: 85.5,
                volume: 70,
                acceleration: 80,
                recency: 95,
            };

            jest.spyOn(redis_service, 'zrangebyscore').mockResolvedValue(
                mock_active_hashtags as any
            );
            jest.spyOn(trend_service as any, 'calculateHashtagScore').mockResolvedValue(
                mock_score_data
            );
            jest.spyOn(trend_service as any, 'updateTrendingList').mockResolvedValue(undefined);
            jest.spyOn(trend_service as any, 'calculateCategoryTrendsFromScores').mockResolvedValue(
                undefined
            );

            await trend_service.calculateTrend();

            expect(redis_service.zrangebyscore).toHaveBeenCalled();
            expect(trend_service['updateTrendingList']).toHaveBeenCalledWith(
                'trending:global',
                expect.any(Array)
            );
            expect(trend_service['calculateCategoryTrendsFromScores']).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            jest.spyOn(redis_service, 'zrangebyscore').mockRejectedValue(new Error('Redis error'));

            await expect(trend_service.calculateTrend()).rejects.toThrow('Redis error');
        });
    });

    describe('calculateHashtagScore', () => {
        it('should calculate score for a hashtag', async () => {
            const mock_buckets = ['1702862400000', '10', '1702862100000', '8'];
            const mock_last_seen = Date.now();

            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue(mock_buckets as any);
            jest.spyOn(redis_service, 'zscore').mockResolvedValue(mock_last_seen.toString());
            jest.spyOn(velocity_calculator, 'calculateFinalMomentum').mockReturnValue(80);

            const result = await trend_service.calculateHashtagScore('#trending');

            expect(result).toBeDefined();
            expect(result).toHaveProperty('hashtag', '#trending');
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('volume');
            expect(result).toHaveProperty('acceleration', 80);
            expect(result).toHaveProperty('recency');
        });

        it('should return null when no buckets found', async () => {
            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue([]);

            const result = await trend_service.calculateHashtagScore('#notfound');

            expect(result).toBeNull();
        });

        it('should handle errors and return null', async () => {
            jest.spyOn(redis_service, 'zrevrange').mockRejectedValue(new Error('Redis error'));

            const result = await trend_service.calculateHashtagScore('#error');

            expect(result).toBeNull();
        });
    });

    describe('updateTrendingList', () => {
        it('should update trending list in redis', async () => {
            const key = 'trending:global';
            const hashtags = [
                { hashtag: '#trending', score: 95 },
                { hashtag: '#viral', score: 85 },
            ];
            const mock_pipeline = {
                del: jest.fn().mockReturnThis(),
                zadd: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            await trend_service['updateTrendingList'](key, hashtags);

            expect(mock_pipeline.del).toHaveBeenCalledWith(key);
            expect(mock_pipeline.zadd).toHaveBeenCalledTimes(2);
            expect(mock_pipeline.exec).toHaveBeenCalled();
        });

        it('should not execute if hashtags list is empty', async () => {
            const key = 'trending:global';
            const hashtags: any[] = [];

            const mock_pipeline = {
                del: jest.fn(),
                zadd: jest.fn(),
                exec: jest.fn(),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            await trend_service['updateTrendingList'](key, hashtags);

            expect(mock_pipeline.del).not.toHaveBeenCalled();
            expect(mock_pipeline.exec).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('getTrending should handle redis errors gracefully', async () => {
            jest.spyOn(redis_service, 'zrevrange').mockRejectedValue(
                new Error('Redis connection failed')
            );

            await expect(trend_service.getTrending()).rejects.toThrow('Redis connection failed');
        });

        it('getHashtagCategories should handle empty hashtag list', async () => {
            const hashtag_names: string[] = [];

            const mock_pipeline = {
                zscore: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            const result = await trend_service.getHashtagCategories(hashtag_names);

            expect(result).toEqual({});
        });

        it('insertCandidateHashtags should handle empty hashtags', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {},
                timestamp: Date.now(),
            };

            jest.spyOn(redis_service, 'zadd').mockResolvedValue(0 as any);

            await expect(trend_service.insertCandidateHashtags(hashtag_job)).resolves.not.toThrow();
        });

        it('insertCandidateCategories should handle redis errors', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 50, News: 30 },
                },
                timestamp: Date.now(),
            };

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockRejectedValue(new Error('Pipeline failed')),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            await expect(trend_service.insertCandidateCategories(hashtag_job)).rejects.toThrow(
                'Pipeline failed'
            );
        });

        it('updateHashtagCounts should handle database errors', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 50 },
                },
                timestamp: Date.now(),
            };

            jest.spyOn(redis_service, 'zincrby').mockRejectedValue(
                new Error('Redis increment failed')
            );

            await expect(trend_service.updateHashtagCounts(hashtag_job)).rejects.toThrow(
                'Redis increment failed'
            );
        });
    });

    describe('Edge Cases', () => {
        it('getTrending should handle very large limit', async () => {
            const large_limit = 1000;

            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue([]);
            jest.spyOn(hashtag_repo, 'find').mockResolvedValue([]);
            jest.spyOn(trend_service as any, 'getHashtagCategories').mockResolvedValue({});

            const result = await trend_service.getTrending(undefined, large_limit);

            expect(redis_service.zrevrange).toHaveBeenCalledWith(
                'trending:global',
                0,
                large_limit - 1,
                'WITHSCORES'
            );
            expect(result.data).toEqual([]);
        });

        it('getTrending should handle special characters in hashtags', async () => {
            const mock_trending_data = ['مصر', '100.5'];
            const mock_hashtags = [{ name: 'مصر', usage_count: 500 }];
            const mock_categories = { مصر: 'News' };

            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue(mock_trending_data as any);
            jest.spyOn(hashtag_repo, 'find').mockResolvedValue(mock_hashtags as any);
            jest.spyOn(trend_service as any, 'getHashtagCategories').mockResolvedValue(
                mock_categories
            );

            const result = await trend_service.getTrending();

            expect(result.data).toHaveLength(1);
            expect(result.data[0].text).toBe('#مصر');
        });

        it('insertCandidateCategories should only include categories above threshold', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 25, News: 25, Entertainment: 50 }, // Only Entertainment >= 30
                },
                timestamp: Date.now(),
            };

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            await trend_service.insertCandidateCategories(hashtag_job);

            // Verify zadd was called with Entertainment category
            expect(mock_pipeline.zadd).toHaveBeenCalled();
        });

        it('getHashtagCategories should handle scores correctly', async () => {
            const hashtag_names = ['#test'];

            const mock_pipeline = {
                zscore: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, '100'], // Sports: 100
                    [null, '50'], // News: 50
                    [null, '30'], // Entertainment: 30
                ]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            const result = await trend_service.getHashtagCategories(hashtag_names);

            // Should return the category with highest score
            expect(result['#test']).toBe('Sports');
        });
    });

    describe('Integration Scenarios', () => {
        it('should process complete hashtag job workflow', async () => {
            const hashtag_job: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 100, News: 0, Entertainment: 0 },
                },
                timestamp: Date.now(),
            };

            // Mock all redis operations
            jest.spyOn(redis_service, 'zadd').mockResolvedValue(1 as any);
            jest.spyOn(redis_service, 'expire').mockResolvedValue(true as any);
            jest.spyOn(redis_service, 'zincrby').mockResolvedValue('1' as any);

            const mock_pipeline = {
                zadd: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(redis_service, 'pipeline').mockReturnValue(mock_pipeline as any);

            // Execute all trend operations
            await trend_service.insertCandidateHashtags(hashtag_job);
            await trend_service.insertCandidateCategories(hashtag_job);
            await trend_service.updateHashtagCounts(hashtag_job);

            expect(redis_service.zadd).toHaveBeenCalled();
            expect(redis_service.zincrby).toHaveBeenCalled();
        });

        it('getTrending should return properly formatted response', async () => {
            const mock_trending_data = [
                'javascript',
                '100.5',
                'typescript',
                '95.3',
                'nestjs',
                '89.2',
            ];
            const mock_hashtags = [
                { name: 'javascript', usage_count: 1500 },
                { name: 'typescript', usage_count: 1200 },
                { name: 'nestjs', usage_count: 980 },
            ];
            const mock_categories = {
                javascript: 'News',
                typescript: 'Entertainment',
                nestjs: 'Only on Yapper',
            };

            jest.spyOn(redis_service, 'zrevrange').mockResolvedValue(mock_trending_data as any);
            jest.spyOn(hashtag_repo, 'find').mockResolvedValue(mock_hashtags as any);
            jest.spyOn(trend_service as any, 'getHashtagCategories').mockResolvedValue(
                mock_categories
            );

            const result = await trend_service.getTrending();

            // Verify structure
            expect(result).toHaveProperty('data');
            expect(Array.isArray(result.data)).toBe(true);
            result.data.forEach((trend: any) => {
                expect(trend).toHaveProperty('text');
                expect(trend).toHaveProperty('posts_count');
                expect(trend).toHaveProperty('trend_rank');
                expect(trend).toHaveProperty('category');
                expect(trend).toHaveProperty('reference_id');
            });
        });
    });
});
