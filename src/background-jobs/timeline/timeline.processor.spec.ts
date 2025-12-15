import { Test, TestingModule } from '@nestjs/testing';
import { TimelineProcessor } from './timeline.processor';
import { TimelineRedisService } from 'src/timeline/services/timeline-redis.service';
import { TimelineCandidatesService } from 'src/timeline/services/timeline-candidates.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import type { Job } from 'bull';
import {
    ICleanupOldTweetsJobDTO,
    IInitTimelineQueueJobDTO,
    IRefillTimelineQueueJobDTO,
} from './timeline.dto';

describe('TimelineProcessor', () => {
    let processor: TimelineProcessor;
    let timeline_redis_service: jest.Mocked<TimelineRedisService>;
    let timeline_candidates_service: jest.Mocked<TimelineCandidatesService>;
    let user_repository: jest.Mocked<Repository<User>>;
    let config_service: jest.Mocked<ConfigService>;

    const mock_user_id = 'user-123';
    const mock_candidates = [
        { tweet_id: 'tweet-1', created_at: new Date('2024-01-01'), category_id: 1, score: 10 },
        { tweet_id: 'tweet-2', created_at: new Date('2024-01-02'), category_id: 1, score: 8 },
        { tweet_id: 'tweet-3', created_at: new Date('2024-01-03'), category_id: 2, score: 5 },
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimelineProcessor,
                {
                    provide: TimelineRedisService,
                    useValue: {
                        getTweetIdsInQueue: jest.fn(),
                        initializeQueue: jest.fn(),
                        addToQueue: jest.fn(),
                        trimQueue: jest.fn(),
                        removeOldTweets: jest.fn(),
                        getQueueSize: jest.fn(),
                    },
                },
                {
                    provide: TimelineCandidatesService,
                    useValue: {
                        getCandidates: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key, default_value) => {
                            if (key === 'TIMELINE_QUEUE_SIZE') return 100;
                            if (key === 'TIMELINE_TWEET_FRESHNESS_DAYS') return 7;
                            if (key === 'TIMELINE_MAX_QUEUE_SIZE') return 200;
                            return default_value;
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        find: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<TimelineProcessor>(TimelineProcessor);
        timeline_redis_service = module.get(TimelineRedisService);
        timeline_candidates_service = module.get(TimelineCandidatesService);
        user_repository = module.get(getRepositoryToken(User));
        config_service = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleInitQueue', () => {
        it('should initialize queue for user', async () => {
            const job: Job<IInitTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id },
            } as any;

            timeline_redis_service.getTweetIdsInQueue.mockResolvedValue(new Set());
            timeline_candidates_service.getCandidates.mockResolvedValue(mock_candidates);
            timeline_redis_service.initializeQueue.mockResolvedValue(3);

            await processor.handleInitQueue(job);

            expect(timeline_redis_service.getTweetIdsInQueue).toHaveBeenCalledWith(mock_user_id);
            expect(timeline_candidates_service.getCandidates).toHaveBeenCalledWith(
                mock_user_id,
                expect.any(Set),
                100
            );
            expect(timeline_redis_service.initializeQueue).toHaveBeenCalledWith(
                mock_user_id,
                expect.arrayContaining([
                    expect.objectContaining({ tweet_id: 'tweet-1' }),
                    expect.objectContaining({ tweet_id: 'tweet-2' }),
                    expect.objectContaining({ tweet_id: 'tweet-3' }),
                ])
            );
        });

        it('should handle no candidates found', async () => {
            const job: Job<IInitTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id },
            } as any;

            timeline_redis_service.getTweetIdsInQueue.mockResolvedValue(new Set());
            timeline_candidates_service.getCandidates.mockResolvedValue([]);

            await processor.handleInitQueue(job);

            expect(timeline_redis_service.initializeQueue).not.toHaveBeenCalled();
        });

        it('should propagate errors', async () => {
            const job: Job<IInitTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id },
            } as any;

            const error = new Error('Redis connection failed');
            timeline_redis_service.getTweetIdsInQueue.mockRejectedValue(error);

            await expect(processor.handleInitQueue(job)).rejects.toThrow('Redis connection failed');
        });
    });

    describe('handleRefillQueue', () => {
        it('should refill queue with new candidates', async () => {
            const job: Job<IRefillTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id, refill_count: 20 },
            } as any;

            timeline_redis_service.getTweetIdsInQueue.mockResolvedValue(
                new Set(['existing-tweet'])
            );
            timeline_candidates_service.getCandidates.mockResolvedValue(mock_candidates);
            timeline_redis_service.addToQueue.mockResolvedValue(3);
            timeline_redis_service.getQueueSize.mockResolvedValue(150); // Less than max, no trim needed

            await processor.handleRefillQueue(job);

            expect(timeline_candidates_service.getCandidates).toHaveBeenCalledWith(
                mock_user_id,
                expect.any(Set),
                20
            );
            expect(timeline_redis_service.addToQueue).toHaveBeenCalledWith(
                mock_user_id,
                expect.any(Array)
            );
            // Should not trim since queue size < max
            expect(timeline_redis_service.trimQueue).not.toHaveBeenCalled();
        });

        it('should exclude existing tweets when refilling', async () => {
            const job: Job<IRefillTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id, refill_count: 20 },
            } as any;

            const existing_ids = new Set(['tweet-1', 'tweet-2']);
            timeline_redis_service.getTweetIdsInQueue.mockResolvedValue(existing_ids);
            timeline_candidates_service.getCandidates.mockResolvedValue(mock_candidates);
            timeline_redis_service.addToQueue.mockResolvedValue(3);
            timeline_redis_service.trimQueue.mockResolvedValue(100);

            await processor.handleRefillQueue(job);

            expect(timeline_candidates_service.getCandidates).toHaveBeenCalledWith(
                mock_user_id,
                existing_ids,
                20
            );
        });

        it('should handle no new candidates found', async () => {
            const job: Job<IRefillTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id, refill_count: 20 },
            } as any;

            timeline_redis_service.getTweetIdsInQueue.mockResolvedValue(new Set());
            timeline_candidates_service.getCandidates.mockResolvedValue([]);

            await processor.handleRefillQueue(job);

            expect(timeline_redis_service.addToQueue).not.toHaveBeenCalled();
            expect(timeline_redis_service.trimQueue).not.toHaveBeenCalled();
        });

        it('should trim queue after adding tweets when size exceeds max', async () => {
            const job: Job<IRefillTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id, refill_count: 20 },
            } as any;

            timeline_redis_service.getTweetIdsInQueue.mockResolvedValue(new Set());
            timeline_candidates_service.getCandidates.mockResolvedValue(mock_candidates);
            timeline_redis_service.addToQueue.mockResolvedValue(3);
            timeline_redis_service.getQueueSize.mockResolvedValue(250); // Exceeds max of 200
            timeline_redis_service.trimQueue.mockResolvedValue(50);

            await processor.handleRefillQueue(job);

            expect(timeline_redis_service.trimQueue).toHaveBeenCalledWith(mock_user_id, 200);
        });

        it('should propagate errors', async () => {
            const job: Job<IRefillTimelineQueueJobDTO> = {
                data: { user_id: mock_user_id, refill_count: 20 },
            } as any;

            const error = new Error('Database error');
            timeline_redis_service.getTweetIdsInQueue.mockRejectedValue(error);

            await expect(processor.handleRefillQueue(job)).rejects.toThrow('Database error');
        });
    });

    describe('handleCleanupOldTweets', () => {
        it('should cleanup old tweets for all users', async () => {
            const job: Job<ICleanupOldTweetsJobDTO> = {
                data: {},
            } as any;

            const mock_users = [
                { id: 'user-1' } as User,
                { id: 'user-2' } as User,
                { id: 'user-3' } as User,
            ];
            user_repository.find.mockResolvedValue(mock_users);
            timeline_redis_service.removeOldTweets.mockResolvedValue(5);

            await processor.handleCleanupOldTweets(job);

            expect(user_repository.find).toHaveBeenCalledWith({
                select: ['id'],
                where: { deleted_at: null },
            });
            expect(timeline_redis_service.removeOldTweets).toHaveBeenCalledTimes(3);
            expect(timeline_redis_service.removeOldTweets).toHaveBeenCalledWith(
                'user-1',
                expect.any(String)
            );
        });

        it('should calculate correct cutoff date', async () => {
            const job: Job<ICleanupOldTweetsJobDTO> = {
                data: {},
            } as any;

            const mock_users = [{ id: 'user-1' } as User];
            user_repository.find.mockResolvedValue(mock_users);
            timeline_redis_service.removeOldTweets.mockResolvedValue(0);

            const now = new Date();
            await processor.handleCleanupOldTweets(job);

            const call_args = timeline_redis_service.removeOldTweets.mock.calls[0];
            const cutoff_timestamp = call_args[1];

            // Verify cutoff timestamp is approximately 7 days ago
            const cutoff_date = new Date(cutoff_timestamp);
            const expected_cutoff = new Date(now);
            expected_cutoff.setDate(expected_cutoff.getDate() - 7);

            const diff_hours = Math.abs(cutoff_date.getTime() - expected_cutoff.getTime()) / 36e5;
            expect(diff_hours).toBeLessThan(1); // Within 1 hour tolerance
        });

        it('should handle empty user list', async () => {
            const job: Job<ICleanupOldTweetsJobDTO> = {
                data: {},
            } as any;

            user_repository.find.mockResolvedValue([]);

            await processor.handleCleanupOldTweets(job);

            expect(timeline_redis_service.removeOldTweets).not.toHaveBeenCalled();
        });

        it('should continue on individual user errors', async () => {
            const job: Job<ICleanupOldTweetsJobDTO> = {
                data: {},
            } as any;

            const mock_users = [
                { id: 'user-1' } as User,
                { id: 'user-2' } as User,
                { id: 'user-3' } as User,
            ];
            user_repository.find.mockResolvedValue(mock_users);

            timeline_redis_service.removeOldTweets
                .mockResolvedValueOnce(5) // user-1 success
                .mockRejectedValueOnce(new Error('Redis error')) // user-2 fails
                .mockResolvedValueOnce(3); // user-3 success

            // Should throw because the implementation throws on error
            await expect(processor.handleCleanupOldTweets(job)).rejects.toThrow();

            // Only 2 calls because it throws on the second user's error
            expect(timeline_redis_service.removeOldTweets).toHaveBeenCalledTimes(2);
        });

        it('should propagate errors from user repository', async () => {
            const job: Job<ICleanupOldTweetsJobDTO> = {
                data: {},
            } as any;

            const error = new Error('Database connection failed');
            user_repository.find.mockRejectedValue(error);

            await expect(processor.handleCleanupOldTweets(job)).rejects.toThrow(
                'Database connection failed'
            );
        });
    });
});
