import { Test, TestingModule } from '@nestjs/testing';
import { ForyouService } from './for-you.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UserTimelineCursor } from 'src/user/entities/user-timeline-cursor.entity';
import { TimelineRedisService } from '../timeline-redis.service';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { RefillTimelineQueueJobService } from 'src/background-jobs/timeline/timeline.service';
import { TimelineCandidatesService } from '../timeline-candidates.service';
import { TweetResponseDTO } from 'src/tweets/dto';

describe('ForyouService', () => {
    let service: ForyouService;
    let timeline_cursor_repository: jest.Mocked<Repository<UserTimelineCursor>>;
    let timeline_redis_service: jest.Mocked<TimelineRedisService>;
    let tweets_repository: jest.Mocked<TweetsRepository>;
    let refill_queue_service: jest.Mocked<RefillTimelineQueueJobService>;
    let timeline_candidates_service: jest.Mocked<TimelineCandidatesService>;
    let config_service: jest.Mocked<ConfigService>;

    const mock_user_id = 'user-123';
    const mock_limit = 20;

    const mock_tweet: TweetResponseDTO = {
        tweet_id: 'tweet-1',
        profile_user_id: 'profile-1',
        tweet_author_id: 'author-1',
        repost_id: null,
        post_type: 'original',
        type: 'tweet',
        content: 'Test tweet content',
        post_date: new Date('2024-01-01'),
        images: [],
        videos: [],
        num_likes: 10,
        num_reposts: 5,
        num_views: 100,
        num_quotes: 2,
        num_replies: 3,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        user: {
            id: 'author-1',
            username: 'testuser',
            name: 'Test User',
            avatar_url: 'http://example.com/avatar.jpg',
            cover_url: 'http://example.com/cover.jpg',
            verified: true,
            bio: 'Test bio',
            followers: 1000,
            following: 500,
        },
    } as any;

    let mock_cursor: UserTimelineCursor;

    beforeEach(async () => {
        // Reset mock cursor for each test
        mock_cursor = {
            user_id: mock_user_id,
            last_fetched_tweet_id: null,
            last_fetched_position: 0,
            last_updated_at: new Date(),
        } as UserTimelineCursor;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ForyouService,
                {
                    provide: getRepositoryToken(UserTimelineCursor),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: TimelineRedisService,
                    useValue: {
                        getFromQueue: jest.fn(),
                        getQueueSize: jest.fn(),
                    },
                },
                {
                    provide: TweetsRepository,
                    useValue: {
                        getTweetsByIds: jest.fn(),
                    },
                },
                {
                    provide: RefillTimelineQueueJobService,
                    useValue: {
                        queueRefillTimelineQueue: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue(20),
                    },
                },
                {
                    provide: TimelineCandidatesService,
                    useValue: {
                        getCandidates: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ForyouService>(ForyouService);
        timeline_cursor_repository = module.get(getRepositoryToken(UserTimelineCursor));
        timeline_redis_service = module.get(TimelineRedisService);
        tweets_repository = module.get(TweetsRepository);
        refill_queue_service = module.get(RefillTimelineQueueJobService);
        timeline_candidates_service = module.get(TimelineCandidatesService);
        config_service = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getForyouTimeline', () => {
        it('should create new cursor if not exists', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(null);
            timeline_cursor_repository.create.mockReturnValue(mock_cursor);
            timeline_cursor_repository.save.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            await service.getForyouTimeline(mock_user_id);

            expect(timeline_cursor_repository.create).toHaveBeenCalledWith({
                user_id: mock_user_id,
                last_fetched_tweet_id: null,
                last_fetched_position: 0,
            });
            expect(timeline_cursor_repository.save).toHaveBeenCalled();
        });

        it('should use existing cursor if found', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            await service.getForyouTimeline(mock_user_id);

            expect(timeline_cursor_repository.create).not.toHaveBeenCalled();
            expect(timeline_redis_service.getFromQueue).toHaveBeenCalledWith(mock_user_id, 0, 20);
        });

        it('should fetch tweets from Redis queue', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
                { tweet_id: 'tweet-2', created_at: '2024-01-02' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            const result = await service.getForyouTimeline(mock_user_id);

            expect(timeline_redis_service.getFromQueue).toHaveBeenCalledWith(
                mock_user_id,
                0,
                mock_limit
            );
            expect(tweets_repository.getTweetsByIds).toHaveBeenCalledWith(
                ['tweet-1', 'tweet-2'],
                mock_user_id
            );
        });

        it('should update cursor position after fetching', async () => {
            const updated_cursor = { ...mock_cursor, last_fetched_position: 20 };
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_cursor_repository.save.mockResolvedValue(updated_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            await service.getForyouTimeline(mock_user_id);

            expect(timeline_cursor_repository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    last_fetched_tweet_id: 'tweet-1',
                    last_fetched_position: 1,
                })
            );
        });

        it('should use fallback when queue is empty', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([]);
            timeline_candidates_service.getCandidates.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: new Date(), category_id: 1, score: 10 },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);

            const result = await service.getForyouTimeline(mock_user_id);

            expect(timeline_candidates_service.getCandidates).toHaveBeenCalledWith(
                mock_user_id,
                expect.any(Set),
                mock_limit
            );
            expect(result.data).toEqual([mock_tweet]);
        });

        it('should return empty when queue and fallback are empty', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([]);
            timeline_candidates_service.getCandidates.mockResolvedValue([]);

            const result = await service.getForyouTimeline(mock_user_id);

            expect(result.data).toEqual([]);
            expect(result.pagination.has_more).toBe(false);
        });

        it('should queue refill job after fetching', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            await service.getForyouTimeline(mock_user_id);

            expect(refill_queue_service.queueRefillTimelineQueue).toHaveBeenCalledWith({
                user_id: mock_user_id,
                refill_count: 20,
            });
        });

        it('should correctly calculate has_more based on queue size', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(25);

            const result = await service.getForyouTimeline(mock_user_id);

            expect(result.pagination.has_more).toBe(true);
        });

        it('should return has_more false when at end of queue', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(1);

            const result = await service.getForyouTimeline(mock_user_id);

            expect(result.pagination.has_more).toBe(false);
        });

        it('should use default limit of 20 when not provided', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            await service.getForyouTimeline(mock_user_id);

            expect(timeline_redis_service.getFromQueue).toHaveBeenCalledWith(mock_user_id, 0, 20);
        });

        it('should handle custom limit values', async () => {
            const custom_limit = 50;
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            await service.getForyouTimeline(mock_user_id, undefined, custom_limit);

            expect(timeline_redis_service.getFromQueue).toHaveBeenCalledWith(
                mock_user_id,
                0,
                custom_limit
            );
        });

        it('should filter out null tweets', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
                { tweet_id: 'tweet-2', created_at: '2024-01-02' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet, null as any]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            const result = await service.getForyouTimeline(mock_user_id);

            expect(result.data.length).toBe(1);
            expect(result.data[0]).toEqual(mock_tweet);
        });

        it('should return correct structure', async () => {
            timeline_cursor_repository.findOne.mockResolvedValue(mock_cursor);
            timeline_redis_service.getFromQueue.mockResolvedValue([
                { tweet_id: 'tweet-1', created_at: '2024-01-01' },
            ]);
            tweets_repository.getTweetsByIds.mockResolvedValue([mock_tweet]);
            timeline_redis_service.getQueueSize.mockResolvedValue(100);

            const result = await service.getForyouTimeline(mock_user_id);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(result.pagination).toHaveProperty('next_cursor');
            expect(result.pagination).toHaveProperty('has_more');
            expect(Array.isArray(result.data)).toBe(true);
        });
    });
});
