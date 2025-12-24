import { Test, TestingModule } from '@nestjs/testing';
import { ICandidateTweet, TimelineCandidatesService } from './timeline-candidates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UserInterests } from 'src/user/entities/user-interests.entity';
import { TweetCategory } from 'src/tweets/entities/tweet-category.entity';
import { Tweet } from 'src/tweets/entities/tweet.entity';
import { Category } from 'src/category/entities/category.entity';
import { InitTimelineQueueJobService } from 'src/background-jobs/timeline/timeline.service';

describe('TimelineCandidatesService', () => {
    let service: TimelineCandidatesService;
    let user_interests_repository: jest.Mocked<Repository<UserInterests>>;
    let tweet_category_repository: jest.Mocked<Repository<TweetCategory>>;
    let tweet_repository: jest.Mocked<Repository<Tweet>>;
    let category_repository: jest.Mocked<Repository<Category>>;
    let config_service: jest.Mocked<ConfigService>;
    let init_timeline_queue_job_service: jest.Mocked<InitTimelineQueueJobService>;

    const mock_user_id = 'user-123';
    const mock_user_interests = [
        { user_id: mock_user_id, category_id: '1', score: 10 },
        { user_id: mock_user_id, category_id: '2', score: 5 },
    ] as unknown as UserInterests[];

    const mock_candidate_tweets: ICandidateTweet[] = [
        { tweet_id: 'tweet-1', created_at: new Date(), category_id: 1, score: 10 },
        { tweet_id: 'tweet-2', created_at: new Date(), category_id: 1, score: 8 },
        { tweet_id: 'tweet-3', created_at: new Date(), category_id: 2, score: 5 },
    ];

    const create_mock_query_builder = () => {
        const qb: any = {
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
        };
        return qb;
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimelineCandidatesService,
                {
                    provide: getRepositoryToken(UserInterests),
                    useValue: {
                        find: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(TweetCategory),
                    useValue: {
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: {
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Category),
                    useValue: {
                        createQueryBuilder: jest.fn(() => ({
                            orderBy: jest.fn().mockReturnThis(),
                            limit: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([]),
                        })),
                    },
                },
                {
                    provide: InitTimelineQueueJobService,
                    useValue: {
                        queueInitTimelineQueue: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key, default_value) => {
                            if (key === 'TIMELINE_TWEET_FRESHNESS_DAYS') return 7;
                            return default_value;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<TimelineCandidatesService>(TimelineCandidatesService);
        user_interests_repository = module.get(getRepositoryToken(UserInterests));
        tweet_category_repository = module.get(getRepositoryToken(TweetCategory));
        tweet_repository = module.get(getRepositoryToken(Tweet));
        category_repository = module.get(getRepositoryToken(Category));
        init_timeline_queue_job_service = module.get(InitTimelineQueueJobService);
        config_service = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getCandidates', () => {
        it('should return candidates based on user interests', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb = create_mock_query_builder();
            // Return enough tweets to avoid fallback
            const many_tweets = Array.from({ length: 10 }, (_, i) => ({
                tweet_id: `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 100 - i * 5,
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            const result = await service.getCandidates(mock_user_id, new Set(), 10);

            expect(user_interests_repository.find).toHaveBeenCalledWith({
                where: { user_id: mock_user_id },
                order: { score: 'DESC' },
            });
            expect(result.length).toBeGreaterThan(0);
        });

        it('should exclude specified tweet IDs', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb = create_mock_query_builder();
            // Return enough tweets to avoid fallback
            const many_tweets = Array.from({ length: 12 }, (_, i) => ({
                tweet_id: i === 5 ? 'tweet-excluded' : `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 100 - i * 5,
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            const excluded = new Set(['tweet-excluded']);
            const result = await service.getCandidates(mock_user_id, excluded, 10);

            expect(result.every((c) => c.tweet_id !== 'tweet-excluded')).toBe(true);
        });

        it('should use random fallback when user has no interests', async () => {
            user_interests_repository.find.mockResolvedValue([]);

            const qb = create_mock_query_builder();
            qb.getRawMany.mockResolvedValue([
                { tweet_id: 'random-1', created_at: new Date() },
                { tweet_id: 'random-2', created_at: new Date() },
            ]);
            tweet_repository.createQueryBuilder.mockReturnValue(qb);

            const result = await service.getCandidates(mock_user_id, new Set(), 10);

            expect(tweet_repository.createQueryBuilder).toHaveBeenCalled();
            expect(result.length).toBeGreaterThanOrEqual(0);
        });

        it('should limit results to requested count', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb = create_mock_query_builder();
            const many_tweets = Array.from({ length: 50 }, (_, i) => ({
                tweet_id: `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 100,
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            const limit = 20;
            const result = await service.getCandidates(mock_user_id, new Set(), limit);

            expect(result.length).toBeLessThanOrEqual(limit);
        });

        it('should sort candidates by score', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb = create_mock_query_builder();
            const many_tweets = Array.from({ length: 10 }, (_, i) => ({
                tweet_id: `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 50 + (i % 2) * 50, // Mix of 50 and 100 percentages
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            const result = await service.getCandidates(mock_user_id, new Set(), 10);

            // Verify results are sorted by score descending
            for (let i = 1; i < result.length; i++) {
                expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
            }
        });

        it('should use fallback when not enough candidates found', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb_category = create_mock_query_builder();
            qb_category.getRawMany.mockResolvedValue([
                {
                    tweet_id: 'tweet-1',
                    created_at: new Date(),
                    category_id: 1,
                    percentage: 100,
                },
            ]);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb_category);

            const qb_fallback = create_mock_query_builder();
            qb_fallback.getRawMany.mockResolvedValue([
                { tweet_id: 'fallback-1', created_at: new Date() },
                { tweet_id: 'fallback-2', created_at: new Date() },
            ]);
            tweet_repository.createQueryBuilder.mockReturnValue(qb_fallback);

            const result = await service.getCandidates(mock_user_id, new Set(), 10);

            // Should have attempted to get fallback tweets
            expect(tweet_repository.createQueryBuilder).toHaveBeenCalled();
        });

        it('should calculate score based on interest and percentage', async () => {
            user_interests_repository.find.mockResolvedValue([
                { user_id: mock_user_id, category_id: '1', score: 10 } as unknown as UserInterests,
            ]);

            const qb = create_mock_query_builder();
            const many_tweets = Array.from({ length: 10 }, (_, i) => ({
                tweet_id: `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 50,
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            const result = await service.getCandidates(mock_user_id, new Set(), 10);

            if (result.length > 0) {
                // Score should be interest_score * (percentage / 100) = 10 * 0.5 = 5
                expect(result[0].score).toBe(5);
            }
        });

        it('should exclude user own tweets', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb = create_mock_query_builder();
            const many_tweets = Array.from({ length: 10 }, (_, i) => ({
                tweet_id: `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 100,
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            await service.getCandidates(mock_user_id, new Set(), 10);

            // Verify the query builder excluded user's own tweets
            expect(qb.andWhere).toHaveBeenCalledWith('tweet.user_id != :user_id', {
                user_id: mock_user_id,
            });
        });

        it('should exclude blocked users tweets', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb = create_mock_query_builder();
            const many_tweets = Array.from({ length: 10 }, (_, i) => ({
                tweet_id: `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 100,
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            await service.getCandidates(mock_user_id, new Set(), 10);

            // Verify blocked users are excluded
            expect(qb.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('user_blocks'),
                expect.any(Object)
            );
        });

        it('should exclude muted users tweets', async () => {
            user_interests_repository.find.mockResolvedValue(mock_user_interests);

            const qb = create_mock_query_builder();
            const many_tweets = Array.from({ length: 10 }, (_, i) => ({
                tweet_id: `tweet-${i}`,
                created_at: new Date(),
                category_id: 1,
                percentage: 100,
            }));
            qb.getRawMany.mockResolvedValue(many_tweets);
            tweet_category_repository.createQueryBuilder.mockReturnValue(qb);

            await service.getCandidates(mock_user_id, new Set(), 10);

            // Verify muted users are excluded
            expect(qb.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('user_mutes'),
                expect.any(Object)
            );
        });
    });
});
