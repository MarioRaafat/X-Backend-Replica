import { Test, TestingModule } from '@nestjs/testing';
import { InterestsCandidateSource } from './interests-source';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
import { UserPostsView } from 'src/tweets/entities/user-posts-view.entity';
import { TweetsRepository } from 'src/tweets/tweets.repository';

describe('InterestsCandidateSource', () => {
    let interests_source: InterestsCandidateSource;
    let tweets_repository: jest.Mocked<TweetsRepository>;
    let user_posts_view_repository: jest.Mocked<Repository<UserPostsView>>;
    let paginate_service: jest.Mocked<PaginationService>;

    const mock_user_id = 'user-123';
    const mock_cursor = 'cursor-abc123';
    const mock_limit = 20;

    const mock_scored_candidate = {
        id: 'tweet-1',
        tweet_id: 'tweet-1',
        repost_id: null,
        profile_user_id: 'author-1',
        tweet_author_id: 'author-1',
        post_type: 'tweet',
        type: 'tweet',
        content: 'This is a test tweet',
        post_date: new Date('2024-01-01'),
        images: null,
        videos: null,
        num_likes: 10,
        num_reposts: 5,
        num_views: 100,
        num_quotes: 2,
        num_replies: 3,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        reposted_by_name: null,
        parent_id: null,
        conversation_id: null,
        group_id: null,
        user: {
            id: 'author-1',
            username: 'testuser',
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            cover_url: 'https://example.com/cover.jpg',
            verified: false,
            bio: 'Test bio',
            followers: 100,
            following: 50,
        },
    };

    const create_mock_query_builder = () => ({
        select: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        addCommonTableExpression: jest.fn(),
        from: jest.fn(),
        orderBy: jest.fn(),
        addOrderBy: jest.fn(),
        limit: jest.fn(),
        setParameters: jest.fn(),
        setParameter: jest.fn(),
        getRawMany: jest.fn(),
        getQuery: jest.fn(),
        getParameters: jest.fn(),
    });

    let mock_query_builder: any;

    beforeEach(async () => {
        mock_query_builder = create_mock_query_builder();

        // Setup default mock chain for query builder
        mock_query_builder.select.mockReturnValue(mock_query_builder);
        mock_query_builder.where.mockReturnValue(mock_query_builder);
        mock_query_builder.andWhere.mockReturnValue(mock_query_builder);
        mock_query_builder.addCommonTableExpression.mockReturnValue(mock_query_builder);
        mock_query_builder.from.mockReturnValue(mock_query_builder);
        mock_query_builder.orderBy.mockReturnValue(mock_query_builder);
        mock_query_builder.addOrderBy.mockReturnValue(mock_query_builder);
        mock_query_builder.limit.mockReturnValue(mock_query_builder);
        mock_query_builder.setParameters.mockReturnValue(mock_query_builder);
        mock_query_builder.setParameter.mockReturnValue(mock_query_builder);
        mock_query_builder.getQuery.mockReturnValue('SELECT * FROM tweets');
        mock_query_builder.getParameters.mockReturnValue({ user_id: mock_user_id });

        const mock_tweets_repository = {
            createQueryBuilder: jest.fn(),
            attachUserInteractionBooleanFlags: jest.fn().mockReturnValue(mock_query_builder),
            attachRepostInfo: jest.fn().mockReturnValue(mock_query_builder),
            attachParentTweetQuery: jest.fn().mockReturnValue(mock_query_builder),
            attachUserFollowFlags: jest.fn(),
        };

        const mock_user_posts_view_repository = {
            createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
            manager: {
                createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
            },
        };

        const mock_pagination_service = {
            applyCursorPagination: jest.fn().mockReturnValue(mock_query_builder),
            generateNextCursor: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InterestsCandidateSource,
                {
                    provide: TweetsRepository,
                    useValue: mock_tweets_repository,
                },
                {
                    provide: getRepositoryToken(UserPostsView),
                    useValue: mock_user_posts_view_repository,
                },
                {
                    provide: PaginationService,
                    useValue: mock_pagination_service,
                },
            ],
        }).compile();

        interests_source = module.get<InterestsCandidateSource>(InterestsCandidateSource);
        tweets_repository = module.get(TweetsRepository);
        user_posts_view_repository = module.get(getRepositoryToken(UserPostsView));
        paginate_service = module.get(PaginationService);
    });

    it('should be defined', () => {
        expect(interests_source).toBeDefined();
        expect(tweets_repository).toBeDefined();
        expect(user_posts_view_repository).toBeDefined();
        expect(paginate_service).toBeDefined();
    });

    describe('getCandidates', () => {
        it('should return candidates with interest-based tweets', async () => {
            const mock_tweets = [mock_scored_candidate, mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            const result = await interests_source.getCandidates(
                mock_user_id,
                undefined,
                mock_limit
            );

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.pagination).toHaveProperty('next_cursor');
            expect(result.pagination).toHaveProperty('has_more');
        });

        it('should use default limit of 20 when not provided', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            const result = await interests_source.getCandidates(mock_user_id);

            expect(result.data).toHaveLength(1);
        });

        it('should apply cursor pagination when cursor is provided', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(mock_cursor);

            await interests_source.getCandidates(mock_user_id, mock_cursor, mock_limit);

            expect(paginate_service.applyCursorPagination).toHaveBeenCalledWith(
                mock_query_builder,
                mock_cursor,
                'ranked',
                'post_date',
                'id'
            );
        });

        it('should exclude blocked users from results', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            await interests_source.getCandidates(mock_user_id);

            expect(mock_query_builder.where).toHaveBeenCalled();
            expect(mock_query_builder.andWhere).toHaveBeenCalled();
        });

        it('should exclude muted users from results', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            await interests_source.getCandidates(mock_user_id);

            expect(mock_query_builder.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('muted_id'),
                expect.any(Object)
            );
        });

        it('should exclude reply type tweets from results', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            await interests_source.getCandidates(mock_user_id);

            expect(mock_query_builder.andWhere).toHaveBeenCalledWith('tweet.type != :reply_type', {
                reply_type: 'reply',
            });
        });

        it('should attach user interaction flags to query', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            await interests_source.getCandidates(mock_user_id);

            expect(tweets_repository.attachUserInteractionBooleanFlags).toHaveBeenCalledWith(
                mock_query_builder,
                mock_user_id,
                'ranked.tweet_author_id',
                'ranked.tweet_id'
            );
        });

        it('should attach repost info to query', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            await interests_source.getCandidates(mock_user_id);

            expect(tweets_repository.attachRepostInfo).toHaveBeenCalledWith(
                mock_query_builder,
                'ranked'
            );
        });

        it('should attach parent tweet query to results', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            await interests_source.getCandidates(mock_user_id);

            expect(tweets_repository.attachParentTweetQuery).toHaveBeenCalledWith(
                mock_query_builder,
                mock_user_id
            );
        });

        it('should map raw tweets to ScoredCandidateDTO instances', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            const result = await interests_source.getCandidates(
                mock_user_id,
                undefined,
                mock_limit
            );

            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toBeInstanceOf(ScoredCandidateDTO);
        });

        it('should set pagination has_more to true when returned items equal limit', async () => {
            const mock_tweets = new Array(mock_limit).fill(mock_scored_candidate);
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue('next-cursor');

            const result = await interests_source.getCandidates(
                mock_user_id,
                undefined,
                mock_limit
            );

            expect(result.pagination.has_more).toBe(true);
        });

        it('should set pagination has_more to false when returned items less than limit', async () => {
            const mock_tweets = [mock_scored_candidate, mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            const result = await interests_source.getCandidates(
                mock_user_id,
                undefined,
                mock_limit
            );

            expect(result.pagination.has_more).toBe(false);
        });

        it('should generate next cursor when available', async () => {
            const mock_tweets = [mock_scored_candidate];
            const expected_next_cursor = 'next-cursor-xyz';
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(expected_next_cursor);

            const result = await interests_source.getCandidates(mock_user_id);

            expect(result.pagination.next_cursor).toBe(expected_next_cursor);
        });

        it('should handle empty results gracefully', async () => {
            mock_query_builder.getRawMany.mockResolvedValue([]);
            tweets_repository.attachUserFollowFlags.mockReturnValue([]);
            paginate_service.generateNextCursor.mockReturnValue(null);

            const result = await interests_source.getCandidates(mock_user_id);

            expect(result.data).toHaveLength(0);
            expect(result.pagination.has_more).toBe(false);
            expect(result.pagination.next_cursor).toBeNull();
        });

        it('should use common table expressions for filtering and ranking', async () => {
            const mock_tweets = [mock_scored_candidate];
            mock_query_builder.getRawMany.mockResolvedValue(mock_tweets);
            tweets_repository.attachUserFollowFlags.mockReturnValue(mock_tweets);
            paginate_service.generateNextCursor.mockReturnValue(null);

            await interests_source.getCandidates(mock_user_id);

            expect(mock_query_builder.addCommonTableExpression).toHaveBeenCalled();
        });

        it('should handle and rank repost tweets properly', async () => {
            const mock_repost = {
                ...mock_scored_candidate,
                repost_id: 'repost-123',
                reposted_by_name: 'Reposted by',
            };
            mock_query_builder.getRawMany.mockResolvedValue([mock_repost]);
            tweets_repository.attachUserFollowFlags.mockReturnValue([mock_repost]);
            paginate_service.generateNextCursor.mockReturnValue(null);

            const result = await interests_source.getCandidates(mock_user_id);

            expect(result.data).toHaveLength(1);
        });
    });
});
