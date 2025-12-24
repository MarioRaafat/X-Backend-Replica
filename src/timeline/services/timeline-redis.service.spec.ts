import { Test, TestingModule } from '@nestjs/testing';
import { ITimelineTweetData, TimelineRedisService } from './timeline-redis.service';
import type Redis from 'ioredis';

describe('TimelineRedisService', () => {
    let service: TimelineRedisService;
    let redis_client: jest.Mocked<Redis>;

    const mock_user_id = 'user-123';
    const mock_tweets: ITimelineTweetData[] = [
        { tweet_id: 'tweet-1', created_at: '2024-01-01T00:00:00.000Z' },
        { tweet_id: 'tweet-2', created_at: '2024-01-02T00:00:00.000Z' },
        { tweet_id: 'tweet-3', created_at: '2024-01-03T00:00:00.000Z' },
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimelineRedisService,
                {
                    provide: 'default_IORedisModuleConnectionToken',
                    useValue: {
                        pipeline: jest.fn(),
                        rpush: jest.fn(),
                        lrange: jest.fn(),
                        llen: jest.fn(),
                        lrem: jest.fn(),
                        del: jest.fn(),
                        ltrim: jest.fn().mockResolvedValue('OK'),
                    },
                },
            ],
        }).compile();

        service = module.get<TimelineRedisService>(TimelineRedisService);
        redis_client = module.get('default_IORedisModuleConnectionToken');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('addToQueue', () => {
        it('should add tweets to queue', async () => {
            const mock_pipeline = {
                rpush: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, 1],
                    [null, 2],
                    [null, 3],
                ]),
            };
            redis_client.pipeline.mockReturnValue(mock_pipeline as any);

            const result = await service.addToQueue(mock_user_id, mock_tweets);

            expect(redis_client.pipeline).toHaveBeenCalled();
            expect(mock_pipeline.rpush).toHaveBeenCalledTimes(3);
            expect(result).toBe(3);
        });

        it('should return 0 when no tweets provided', async () => {
            const result = await service.addToQueue(mock_user_id, []);

            expect(result).toBe(0);
            expect(redis_client.pipeline).not.toHaveBeenCalled();
        });

        it('should handle pipeline errors', async () => {
            const mock_pipeline = {
                rpush: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(null),
            };
            redis_client.pipeline.mockReturnValue(mock_pipeline as any);

            const result = await service.addToQueue(mock_user_id, mock_tweets);

            expect(result).toBe(0);
        });
    });

    describe('getFromQueue', () => {
        it('should fetch tweets from queue', async () => {
            const serialized = mock_tweets.map((t) => JSON.stringify(t));
            redis_client.lrange.mockResolvedValue(serialized);

            const result = await service.getFromQueue(mock_user_id, 0, 3);

            expect(redis_client.lrange).toHaveBeenCalledWith('timeline:foryou:user-123', 0, 2);
            expect(result).toEqual(mock_tweets);
        });

        it('should return empty array when no tweets found', async () => {
            redis_client.lrange.mockResolvedValue([]);

            const result = await service.getFromQueue(mock_user_id, 0, 10);

            expect(result).toEqual([]);
        });

        it('should handle pagination correctly', async () => {
            const serialized = [JSON.stringify(mock_tweets[1])];
            redis_client.lrange.mockResolvedValue(serialized);

            const result = await service.getFromQueue(mock_user_id, 1, 1);

            expect(redis_client.lrange).toHaveBeenCalledWith('timeline:foryou:user-123', 1, 1);
            expect(result).toEqual([mock_tweets[1]]);
        });
    });

    describe('getQueueSize', () => {
        it('should return queue size', async () => {
            redis_client.llen.mockResolvedValue(100);

            const result = await service.getQueueSize(mock_user_id);

            expect(redis_client.llen).toHaveBeenCalledWith('timeline:foryou:user-123');
            expect(result).toBe(100);
        });

        it('should return 0 for empty queue', async () => {
            redis_client.llen.mockResolvedValue(0);

            const result = await service.getQueueSize(mock_user_id);

            expect(result).toBe(0);
        });
    });

    describe('isTweetInQueue', () => {
        it('should return true when tweet exists', async () => {
            const serialized = mock_tweets.map((t) => JSON.stringify(t));
            redis_client.llen.mockResolvedValue(3);
            redis_client.lrange.mockResolvedValue(serialized);

            const result = await service.isTweetInQueue(mock_user_id, 'tweet-2');

            expect(result).toBe(true);
        });

        it('should return false when tweet does not exist', async () => {
            const serialized = mock_tweets.map((t) => JSON.stringify(t));
            redis_client.llen.mockResolvedValue(3);
            redis_client.lrange.mockResolvedValue(serialized);

            const result = await service.isTweetInQueue(mock_user_id, 'tweet-999');

            expect(result).toBe(false);
        });

        it('should return false for empty queue', async () => {
            redis_client.llen.mockResolvedValue(0);
            redis_client.lrange.mockResolvedValue([]);

            const result = await service.isTweetInQueue(mock_user_id, 'tweet-1');

            expect(result).toBe(false);
        });
    });

    describe('getTweetIdsInQueue', () => {
        it('should return all tweet IDs in queue', async () => {
            const serialized = mock_tweets.map((t) => JSON.stringify(t));
            redis_client.llen.mockResolvedValue(3);
            redis_client.lrange.mockResolvedValue(serialized);

            const result = await service.getTweetIdsInQueue(mock_user_id);

            expect(result.size).toBe(3);
            expect(result.has('tweet-1')).toBe(true);
            expect(result.has('tweet-2')).toBe(true);
            expect(result.has('tweet-3')).toBe(true);
        });

        it('should return empty set for empty queue', async () => {
            redis_client.llen.mockResolvedValue(0);
            redis_client.lrange.mockResolvedValue([]);

            const result = await service.getTweetIdsInQueue(mock_user_id);

            expect(result.size).toBe(0);
        });
    });

    describe('removeOldTweets', () => {
        it('should remove tweets older than cutoff date', async () => {
            const all_tweets = [
                { tweet_id: 'tweet-1', created_at: '2024-01-01T00:00:00.000Z' }, // old
                { tweet_id: 'tweet-2', created_at: '2024-01-10T00:00:00.000Z' }, // new
                { tweet_id: 'tweet-3', created_at: '2024-01-02T00:00:00.000Z' }, // old
            ];
            const serialized = all_tweets.map((t) => JSON.stringify(t));
            redis_client.llen.mockResolvedValue(3);
            redis_client.lrange.mockResolvedValue(serialized);

            const mock_pipeline = {
                lrem: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            redis_client.pipeline.mockReturnValue(mock_pipeline as any);

            const cutoff_timestamp = '2024-01-05T00:00:00.000Z';
            const result = await service.removeOldTweets(mock_user_id, cutoff_timestamp);

            expect(mock_pipeline.lrem).toHaveBeenCalledTimes(2);
            expect(mock_pipeline.exec).toHaveBeenCalledTimes(1);
            expect(result).toBe(2);
        });

        it('should return 0 when no old tweets found', async () => {
            const serialized = mock_tweets.map((t) => JSON.stringify(t));
            redis_client.llen.mockResolvedValue(3);
            redis_client.lrange.mockResolvedValue(serialized);

            const mock_pipeline = {
                lrem: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([]),
            };
            redis_client.pipeline.mockReturnValue(mock_pipeline as any);

            const cutoff_timestamp = '2023-01-01T00:00:00.000Z';
            const result = await service.removeOldTweets(mock_user_id, cutoff_timestamp);

            expect(mock_pipeline.lrem).not.toHaveBeenCalled();
            expect(mock_pipeline.exec).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });
    });

    describe('initializeQueue', () => {
        it('should clear and initialize queue with new tweets', async () => {
            const mock_pipeline = {
                rpush: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([
                    [null, 1],
                    [null, 2],
                    [null, 3],
                ]),
            };
            redis_client.del.mockResolvedValue(1);
            redis_client.pipeline.mockReturnValue(mock_pipeline as any);

            const result = await service.initializeQueue(mock_user_id, mock_tweets);

            expect(redis_client.del).toHaveBeenCalledWith('timeline:foryou:user-123');
            expect(result).toBe(3);
        });

        it('should return 0 for empty tweet array', async () => {
            redis_client.del.mockResolvedValue(1);

            const result = await service.initializeQueue(mock_user_id, []);

            expect(redis_client.del).toHaveBeenCalled();
            expect(result).toBe(0);
        });
    });

    describe('trimQueue', () => {
        it('should trim queue to max size', async () => {
            redis_client.llen.mockResolvedValue(7000);
            redis_client.ltrim.mockResolvedValue('OK');

            const result = await service.trimQueue(mock_user_id, 5000);

            expect(redis_client.ltrim).toHaveBeenCalledWith('timeline:foryou:user-123', 2000, -1);
            expect(result).toBe(2000);
        });

        it('should return 0 when queue is smaller than max', async () => {
            redis_client.llen.mockResolvedValue(100);

            const result = await service.trimQueue(mock_user_id, 200);

            expect(redis_client.ltrim).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });
    });
});
