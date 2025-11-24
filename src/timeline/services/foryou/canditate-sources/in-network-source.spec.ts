import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { UserPostsView } from 'src/tweets/entities/user-posts-view.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
import { InterestsCandidateSource } from './interests-source';

describe('InterestsCandidateSource', () => {
    let service: InterestsCandidateSource;
    let user_posts_view_repository: Repository<UserPostsView>;
    let tweets_repository: TweetsRepository;
    let pagination_service: PaginationService;
    let query_builder: jest.Mocked<SelectQueryBuilder<UserPostsView>>;

    const mock_user_id = 'user-123';
    const mock_cursor = 'cursor-abc';
    const mock_limit = 20;

    const mock_tweet_data = [
        {
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
        },
    ];

    beforeEach(async () => {
        // Create mock query builder
        query_builder = {
            select: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            setParameter: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue(mock_tweet_data),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InterestsCandidateSource,
                {
                    provide: TweetsRepository,
                    useValue: {
                        attachUserInteractionBooleanFlags: jest.fn().mockReturnValue(query_builder),
                        attachRepostInfo: jest.fn().mockReturnValue(query_builder),
                        attachUserFollowFlags: jest.fn().mockImplementation((tweets) => tweets),
                    },
                },
                {
                    provide: getRepositoryToken(UserPostsView),
                    useValue: {
                        createQueryBuilder: jest.fn().mockReturnValue(query_builder),
                    },
                },
                {
                    provide: PaginationService,
                    useValue: {
                        applyCursorPagination: jest.fn().mockReturnValue(query_builder),
                        generateNextCursor: jest.fn().mockReturnValue('next-cursor'),
                    },
                },
            ],
        }).compile();

        service = module.get<InterestsCandidateSource>(InterestsCandidateSource);
        user_posts_view_repository = module.get<Repository<UserPostsView>>(
            getRepositoryToken(UserPostsView)
        );
        tweets_repository = module.get<TweetsRepository>(TweetsRepository);
        pagination_service = module.get<PaginationService>(PaginationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getCandidates', () => {
        it('should return candidates with interest-based tweets', async () => {
            const result = await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(result.data).toBeInstanceOf(Array);
            expect(result.data.length).toBe(mock_tweet_data.length);
            expect(result.pagination.next_cursor).toBe('next-cursor');
            expect(result.pagination.has_more).toBe(false);
        });

        it('should build query with correct joins and filters', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(user_posts_view_repository.createQueryBuilder).toHaveBeenCalledWith('tweet');
            expect(query_builder.select).toHaveBeenCalled();
            expect(query_builder.innerJoin).toHaveBeenCalledWith(
                'tweet_categories',
                'tc',
                'tc.tweet_id = tweet.tweet_id'
            );
            expect(query_builder.innerJoin).toHaveBeenCalledWith(
                'user_interests',
                'ui',
                'ui.category_id = tc.category_id AND ui.user_id = :user_id',
                { user_id: mock_user_id }
            );
        });

        it('should filter out muted and blocked users', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(query_builder.where).toHaveBeenCalledWith(
                'tweet.tweet_author_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = :user_id)',
                { user_id: mock_user_id }
            );
            expect(query_builder.andWhere).toHaveBeenCalledWith(
                'tweet.tweet_author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = :user_id)',
                { user_id: mock_user_id }
            );
        });

        it('should apply default ordering by post_date DESC', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(query_builder.orderBy).toHaveBeenCalledWith('tweet.post_date', 'DESC');
        });

        it('should apply limit correctly', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(query_builder.limit).toHaveBeenCalledWith(mock_limit);
        });

        it('should attach user interaction flags', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(tweets_repository.attachUserInteractionBooleanFlags).toHaveBeenCalledWith(
                query_builder,
                mock_user_id,
                'tweet.tweet_author_id',
                'tweet.tweet_id'
            );
        });

        it('should attach repost info', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(tweets_repository.attachRepostInfo).toHaveBeenCalledWith(query_builder);
        });

        it('should apply cursor pagination', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(pagination_service.applyCursorPagination).toHaveBeenCalledWith(
                query_builder,
                mock_cursor,
                'tweet',
                'post_date',
                'tweet_id'
            );
        });

        it('should fall back to random tweets when no interest-based tweets found', async () => {
            query_builder.getRawMany
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(mock_tweet_data);

            const result = await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(query_builder.orderBy).toHaveBeenCalledWith('RANDOM()');
            expect(result.data.length).toBe(mock_tweet_data.length);
        });

        it('should not include innerJoin for interests in fallback query', async () => {
            query_builder.getRawMany
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(mock_tweet_data);

            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            const inner_join_calls = (query_builder.innerJoin as jest.Mock).mock.calls;
            const fallback_calls = inner_join_calls.slice(2); // After first query

            expect(fallback_calls.length).toBe(0);
        });

        it('should attach user follow flags to results', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(tweets_repository.attachUserFollowFlags).toHaveBeenCalledWith(mock_tweet_data);
        });

        it('should generate next cursor from results', async () => {
            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(pagination_service.generateNextCursor).toHaveBeenCalledWith(
                mock_tweet_data,
                'post_date',
                'tweet_id'
            );
        });

        it('should set has_more to true when results equal limit', async () => {
            const full_results = Array(20).fill(mock_tweet_data[0]);
            query_builder.getRawMany.mockResolvedValue(full_results);

            const result = await service.getCandidates(mock_user_id, mock_cursor, 20);

            expect(result.pagination.has_more).toBe(true);
        });

        it('should set has_more to false when results less than limit', async () => {
            const result = await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(result.pagination.has_more).toBe(false);
        });

        it('should use default limit of 20 when not provided', async () => {
            await service.getCandidates(mock_user_id, mock_cursor);

            expect(query_builder.limit).toHaveBeenCalledWith(20);
        });

        it('should work without cursor parameter', async () => {
            const result = await service.getCandidates(mock_user_id);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(pagination_service.applyCursorPagination).toHaveBeenCalledWith(
                query_builder,
                undefined,
                'tweet',
                'post_date',
                'tweet_id'
            );
        });

        it('should return empty data array when no tweets found in both queries', async () => {
            query_builder.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

            const result = await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(result.data).toEqual([]);
            expect(result.pagination.has_more).toBe(false);
        });

        it('should log the number of tweets found', async () => {
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            await service.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(console_spy).toHaveBeenCalledWith(mock_tweet_data.length);

            console_spy.mockRestore();
        });
    });
});
