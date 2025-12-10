import { Test, TestingModule } from '@nestjs/testing';
import { ExploreJobsProcessor } from './explore-jobs.processor';
import { ExploreJobsService } from './explore-jobs.service';
import type { Job } from 'bull';

describe('ExploreJobsProcessor', () => {
    let processor: ExploreJobsProcessor;
    let explore_jobs_service: ExploreJobsService;

    const mock_explore_jobs_service = {
        countTweetsForRecalculation: jest.fn(),
        fetchTweetsForRecalculation: jest.fn(),
        calculateScore: jest.fn(),
        updateRedisCategoryScores: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreJobsProcessor,
                { provide: ExploreJobsService, useValue: mock_explore_jobs_service },
            ],
        }).compile();

        processor = module.get<ExploreJobsProcessor>(ExploreJobsProcessor);
        explore_jobs_service = module.get<ExploreJobsService>(ExploreJobsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleRecalculateExploreScores', () => {
        it('should process tweets and return result', async () => {
            const mock_job = {
                id: '1',
                data: {
                    since_hours: 24,
                    max_age_hours: 168,
                    batch_size: 100,
                    force_all: false,
                },
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            const mock_tweets = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 10,
                    num_reposts: 5,
                    num_quotes: 2,
                    num_replies: 3,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            mock_explore_jobs_service.countTweetsForRecalculation.mockResolvedValue(1);
            mock_explore_jobs_service.fetchTweetsForRecalculation.mockResolvedValueOnce(
                mock_tweets
            );
            mock_explore_jobs_service.fetchTweetsForRecalculation.mockResolvedValueOnce([]);
            mock_explore_jobs_service.calculateScore.mockReturnValue(50);
            mock_explore_jobs_service.updateRedisCategoryScores.mockResolvedValue(1);

            const result = await processor.handleRecalculateExploreScores(mock_job);

            expect(result.tweets_processed).toBe(1);
            expect(result.tweets_updated).toBe(1);
            expect(result.categories_updated).toBe(1);
            expect(result.duration_ms).toBeGreaterThanOrEqual(0);
            expect(result.errors).toEqual([]);
        });

        it('should handle empty tweet list', async () => {
            const mock_job = {
                id: '2',
                data: {},
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            mock_explore_jobs_service.countTweetsForRecalculation.mockResolvedValue(0);

            const result = await processor.handleRecalculateExploreScores(mock_job);

            expect(result.tweets_processed).toBe(0);
            expect(result.tweets_updated).toBe(0);
            expect(mock_job.progress).toHaveBeenCalledWith(100);
        });

        it('should handle multiple batches', async () => {
            const mock_job = {
                id: '3',
                data: {
                    batch_size: 2,
                },
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            const batch1 = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 10,
                    num_reposts: 5,
                    num_quotes: 2,
                    num_replies: 3,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
                {
                    tweet_id: 'tweet-2',
                    num_likes: 8,
                    num_reposts: 4,
                    num_quotes: 1,
                    num_replies: 2,
                    created_at: new Date(),
                    categories: [{ category_id: '20', percentage: 100 }],
                },
            ];

            const batch2 = [
                {
                    tweet_id: 'tweet-3',
                    num_likes: 5,
                    num_reposts: 2,
                    num_quotes: 1,
                    num_replies: 1,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            mock_explore_jobs_service.countTweetsForRecalculation.mockResolvedValue(3);
            mock_explore_jobs_service.fetchTweetsForRecalculation
                .mockResolvedValueOnce(batch1)
                .mockResolvedValueOnce(batch2)
                .mockResolvedValueOnce([]);
            mock_explore_jobs_service.calculateScore.mockReturnValue(50);
            mock_explore_jobs_service.updateRedisCategoryScores
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(1);

            const result = await processor.handleRecalculateExploreScores(mock_job);

            expect(result.tweets_processed).toBe(3);
            expect(result.tweets_updated).toBe(3);
            // Should call twice (batch1 has 2 tweets, batch2 has 1 tweet = 3 total)
            expect(mock_explore_jobs_service.fetchTweetsForRecalculation).toHaveBeenCalledTimes(2);
        });

        it('should handle batch processing errors', async () => {
            const mock_job = {
                id: '4',
                data: {
                    batch_size: 100,
                },
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            const mock_tweets = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 10,
                    num_reposts: 5,
                    num_quotes: 2,
                    num_replies: 3,
                    created_at: new Date(),
                    categories: [],
                },
            ];

            mock_explore_jobs_service.countTweetsForRecalculation.mockResolvedValue(1);
            mock_explore_jobs_service.fetchTweetsForRecalculation
                .mockResolvedValueOnce(mock_tweets)
                .mockResolvedValueOnce([]);
            mock_explore_jobs_service.calculateScore.mockImplementation(() => {
                throw new Error('Calculation error');
            });

            const result = await processor.handleRecalculateExploreScores(mock_job);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Page 1 failed');
        });

        it('should update progress correctly', async () => {
            const mock_job = {
                id: '5',
                data: {
                    batch_size: 1,
                },
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            const mock_tweets = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 10,
                    num_reposts: 5,
                    num_quotes: 2,
                    num_replies: 3,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            mock_explore_jobs_service.countTweetsForRecalculation.mockResolvedValue(1);
            mock_explore_jobs_service.fetchTweetsForRecalculation
                .mockResolvedValueOnce(mock_tweets)
                .mockResolvedValueOnce([]);
            mock_explore_jobs_service.calculateScore.mockReturnValue(50);
            mock_explore_jobs_service.updateRedisCategoryScores.mockResolvedValue(1);

            await processor.handleRecalculateExploreScores(mock_job);

            expect(mock_job.progress).toHaveBeenCalledWith(5);
            expect(mock_job.progress).toHaveBeenCalledWith(100);
        });

        it('should handle fatal errors', async () => {
            const mock_job = {
                id: '6',
                data: {},
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            mock_explore_jobs_service.countTweetsForRecalculation.mockRejectedValue(
                new Error('Database connection failed')
            );

            await expect(processor.handleRecalculateExploreScores(mock_job)).rejects.toThrow(
                'Database connection failed'
            );
        });

        it('should use default values when job data is empty', async () => {
            const mock_job = {
                id: '7',
                data: {},
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            mock_explore_jobs_service.countTweetsForRecalculation.mockResolvedValue(0);

            const result = await processor.handleRecalculateExploreScores(mock_job);

            expect(mock_explore_jobs_service.countTweetsForRecalculation).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should track maximum categories_updated across batches', async () => {
            const mock_job = {
                id: '8',
                data: {
                    batch_size: 1,
                },
                progress: jest.fn().mockResolvedValue(undefined),
            } as unknown as Job;

            const batch1 = [
                {
                    tweet_id: 'tweet-1',
                    num_likes: 10,
                    num_reposts: 5,
                    num_quotes: 2,
                    num_replies: 3,
                    created_at: new Date(),
                    categories: [{ category_id: '21', percentage: 100 }],
                },
            ];

            const batch2 = [
                {
                    tweet_id: 'tweet-2',
                    num_likes: 8,
                    num_reposts: 4,
                    num_quotes: 1,
                    num_replies: 2,
                    created_at: new Date(),
                    categories: [
                        { category_id: '20', percentage: 50 },
                        { category_id: '21', percentage: 50 },
                    ],
                },
            ];

            mock_explore_jobs_service.countTweetsForRecalculation.mockResolvedValue(2);
            mock_explore_jobs_service.fetchTweetsForRecalculation
                .mockResolvedValueOnce(batch1)
                .mockResolvedValueOnce(batch2)
                .mockResolvedValueOnce([]);
            mock_explore_jobs_service.calculateScore.mockReturnValue(50);
            mock_explore_jobs_service.updateRedisCategoryScores
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2);

            const result = await processor.handleRecalculateExploreScores(mock_job);

            expect(result.categories_updated).toBe(2);
        });
    });
});
