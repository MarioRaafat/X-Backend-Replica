import { Test, TestingModule } from '@nestjs/testing';
import { TweetsRepository } from './tweets.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tweet, TweetLike, TweetRepost } from './entities';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { TimelinePaginationDto } from 'src/timeline/dto/timeline-pagination.dto';
import { TweetType } from 'src/shared/enums/tweet-types.enum';

describe('TweetsRepository', () => {
    let repository: TweetsRepository;
    let tweet_repository: Repository<Tweet>;
    let tweet_like_repository: Repository<TweetLike>;
    let tweet_repost_repository: Repository<TweetRepost>;
    let pagination_service: PaginationService;
    let data_source: DataSource;

    const MOCK_QUERY_BUILDER = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
    };

    const MOCK_TWEET_REPOSITORY = {
        createQueryBuilder: jest.fn(() => MOCK_QUERY_BUILDER),
    };

    const MOCK_TWEET_LIKE_REPOSITORY = {
        createQueryBuilder: jest.fn(() => MOCK_QUERY_BUILDER),
    };

    const MOCK_TWEET_REPOST_REPOSITORY = {
        createQueryBuilder: jest.fn(() => MOCK_QUERY_BUILDER),
    };

    const MOCK_PAGINATION_SERVICE = {
        applyCursorPagination: jest.fn(),
        generateNextCursor: jest.fn(),
    };

    const MOCK_QUERY_RUNNER = {
        connect: jest.fn(),
        query: jest.fn(),
        release: jest.fn(),
    };

    const MOCK_DATA_SOURCE = {
        createQueryRunner: jest.fn(() => MOCK_QUERY_RUNNER),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TweetsRepository,
                { provide: getRepositoryToken(Tweet), useValue: MOCK_TWEET_REPOSITORY },
                { provide: getRepositoryToken(TweetLike), useValue: MOCK_TWEET_LIKE_REPOSITORY },
                {
                    provide: getRepositoryToken(TweetRepost),
                    useValue: MOCK_TWEET_REPOST_REPOSITORY,
                },
                { provide: PaginationService, useValue: MOCK_PAGINATION_SERVICE },
                { provide: DataSource, useValue: MOCK_DATA_SOURCE },
            ],
        }).compile();

        repository = module.get<TweetsRepository>(TweetsRepository);
        tweet_repository = module.get<Repository<Tweet>>(getRepositoryToken(Tweet));
        tweet_like_repository = module.get<Repository<TweetLike>>(getRepositoryToken(TweetLike));
        tweet_repost_repository = module.get<Repository<TweetRepost>>(
            getRepositoryToken(TweetRepost)
        );
        pagination_service = module.get<PaginationService>(PaginationService);
        data_source = module.get<DataSource>(DataSource);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('getFollowingTweets', () => {
        it('should return following tweets with pagination', async () => {
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const raw_results = [
                {
                    tweet_tweet_id: 'tweet1',
                    tweet_type: 'tweet',
                    tweet_content: 'Hello world',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'John Doe',
                    user_username: 'johndoe',
                    user_avatar_url: 'avatar.jpg',
                    user_verified: true,
                    user_bio: 'Bio',
                    user_cover_url: 'cover.jpg',
                    user_followers: 100,
                    user_following: 50,
                    tweet_num_likes: 5,
                    tweet_num_reposts: 2,
                    tweet_num_quotes: 1,
                    tweet_num_replies: 3,
                    tweet_num_views: 100,
                    is_liked: true,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-01'),
                    tweet_updated_at: new Date('2024-01-01'),
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getFollowingTweets(user_id, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].tweet_id).toBe('tweet1');
            expect(result.tweets[0].content).toBe('Hello world');
            expect(result.tweets[0].is_liked).toBe(true);
            expect(MOCK_TWEET_REPOSITORY.createQueryBuilder).toHaveBeenCalled();
        });

        it('should handle cursor pagination', async () => {
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = {
                limit: 10,
                cursor: '2024-01-01T00:00:00.000Z_tweet123',
            };

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue([]);

            await repository.getFollowingTweets(user_id, pagination);

            expect(MOCK_QUERY_BUILDER.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('tweet.created_at'),
                expect.objectContaining({
                    cursor_timestamp: '2024-01-01T00:00:00.000Z',
                    cursor_id: 'tweet123',
                })
            );
        });

        it('should return next_cursor when limit is reached', async () => {
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 2 };

            const raw_results = [
                {
                    tweet_tweet_id: 'tweet1',
                    tweet_content: 'Content 1',
                    tweet_type: 'tweet',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'User 1',
                    user_username: 'user1',
                    user_avatar_url: '',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 0,
                    tweet_num_reposts: 0,
                    tweet_num_quotes: 0,
                    tweet_num_replies: 0,
                    tweet_num_views: 0,
                    is_liked: false,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-01T10:00:00Z'),
                    tweet_updated_at: new Date('2024-01-01T10:00:00Z'),
                },
                {
                    tweet_tweet_id: 'tweet2',
                    tweet_content: 'Content 2',
                    tweet_type: 'tweet',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user2',
                    user_name: 'User 2',
                    user_username: 'user2',
                    user_avatar_url: '',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 0,
                    tweet_num_reposts: 0,
                    tweet_num_quotes: 0,
                    tweet_num_replies: 0,
                    tweet_num_views: 0,
                    is_liked: false,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-01T09:00:00Z'),
                    tweet_updated_at: new Date('2024-01-01T09:00:00Z'),
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getFollowingTweets(user_id, pagination);

            expect(result.next_cursor).toContain('tweet2');
        });

        it('should handle reposted tweets', async () => {
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const raw_results = [
                {
                    tweet_tweet_id: 'tweet1',
                    tweet_type: 'repost',
                    tweet_content: 'Original content',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'John Doe',
                    user_username: 'johndoe',
                    user_avatar_url: 'avatar.jpg',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 0,
                    tweet_num_reposts: 0,
                    tweet_num_quotes: 0,
                    tweet_num_replies: 0,
                    tweet_num_views: 0,
                    is_liked: false,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-01'),
                    tweet_updated_at: new Date('2024-01-01'),
                    repost_id: 'repost1',
                    repost_user_id: 'reposter1',
                    repost_user_name: 'Reposter',
                    repost_created_at: new Date('2024-01-02'),
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getFollowingTweets(user_id, pagination);

            expect(result.tweets[0].reposted_by).toBeDefined();
            expect(result.tweets[0].reposted_by?.id).toBe('reposter1');
            expect(result.tweets[0].reposted_by?.name).toBe('Reposter');
        });

        it('should include parent tweet info for replies/quotes', async () => {
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const raw_results = [
                {
                    tweet_tweet_id: 'reply1',
                    tweet_type: 'reply',
                    tweet_content: 'This is a reply',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'User One',
                    user_username: 'userone',
                    user_avatar_url: '',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 5,
                    tweet_num_reposts: 0,
                    tweet_num_quotes: 0,
                    tweet_num_replies: 0,
                    tweet_num_views: 10,
                    is_liked: false,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-02'),
                    tweet_updated_at: new Date('2024-01-02'),
                    parent_tweet_id: 'parent123',
                    parent_user_id: 'parentuser',
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getFollowingTweets(user_id, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].parent_tweet_id).toBe('parent123');
            expect(result.tweets[0].tweet_id).toBe('reply1');
        });
    });

    describe('getForyouTweets', () => {
        it('should return random tweets for you feed', async () => {
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const raw_results = [
                {
                    tweet_tweet_id: 'tweet1',
                    tweet_type: 'tweet',
                    tweet_content: 'Random tweet',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'Random User',
                    user_username: 'randomuser',
                    user_avatar_url: '',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 10,
                    tweet_num_reposts: 5,
                    tweet_num_quotes: 2,
                    tweet_num_replies: 3,
                    tweet_num_views: 50,
                    is_liked: false,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-01'),
                    tweet_updated_at: new Date('2024-01-01'),
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getForyouTweets(user_id, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].content).toBe('Random tweet');
            expect(MOCK_QUERY_BUILDER.orderBy).toHaveBeenCalledWith('RANDOM()');
        });

        it('should handle cursor in for you feed', async () => {
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = {
                limit: 10,
                cursor: '2024-01-01T00:00:00.000Z_tweet123',
            };

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue([]);

            await repository.getForyouTweets(user_id, pagination);

            expect(MOCK_QUERY_BUILDER.andWhere).toHaveBeenCalled();
        });
    });

    describe('getReplies', () => {
        it('should return replies for a tweet', async () => {
            const tweet_id = 'tweet123';
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const raw_results = [
                {
                    tweet_tweet_id: 'reply1',
                    tweet_type: 'reply',
                    tweet_content: 'This is a reply',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'Replier',
                    user_username: 'replier',
                    user_avatar_url: '',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 2,
                    tweet_num_reposts: 0,
                    tweet_num_quotes: 0,
                    tweet_num_replies: 0,
                    tweet_num_views: 10,
                    is_liked: false,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-01'),
                    tweet_updated_at: new Date('2024-01-01'),
                    parent_tweet_id: tweet_id,
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getReplies(tweet_id, user_id, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].type).toBe('reply');
            expect(result.tweets[0].parent_tweet_id).toBe(tweet_id);
        });

        it('should apply cursor pagination for replies', async () => {
            const tweet_id = 'tweet123';
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = {
                limit: 10,
                cursor: '2024-01-01T00:00:00.000Z_reply123',
            };

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue([]);

            await repository.getReplies(tweet_id, user_id, pagination);

            expect(MOCK_QUERY_BUILDER.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('tweet.created_at'),
                expect.any(Object)
            );
        });

        it('should include parent tweet info when available', async () => {
            const tweet_id = 'tweet123';
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const raw_results = [
                {
                    tweet_tweet_id: 'reply1',
                    tweet_type: 'reply',
                    tweet_content: 'This is a reply',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'Replier',
                    user_username: 'replier',
                    user_avatar_url: '',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 2,
                    tweet_num_reposts: 0,
                    tweet_num_quotes: 0,
                    tweet_num_replies: 0,
                    tweet_num_views: 10,
                    is_liked: false,
                    is_reposted: false,
                    is_following: false,
                    tweet_created_at: new Date('2024-01-01'),
                    tweet_updated_at: new Date('2024-01-01'),
                    parent_tweet_id: 'parent123',
                    parent_user_id: 'parentuser123',
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getReplies(tweet_id, user_id, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].parent_tweet_id).toBe('parent123');
            expect(result.tweets[0].parent_tweet_id).toBeDefined();
            expect(result.tweets[0].tweet_id).toBe('reply1');
        });

        it('should include reposted_by info when available', async () => {
            const tweet_id = 'tweet123';
            const user_id = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const raw_results = [
                {
                    tweet_tweet_id: 'reply1',
                    tweet_type: 'reply',
                    tweet_content: 'This is a reply',
                    tweet_images: [],
                    tweet_videos: [],
                    user_id: 'user1',
                    user_name: 'Replier',
                    user_username: 'replier',
                    user_avatar_url: '',
                    user_verified: false,
                    user_bio: '',
                    user_cover_url: '',
                    user_followers: 0,
                    user_following: 0,
                    tweet_num_likes: 2,
                    tweet_num_reposts: 0,
                    tweet_num_quotes: 0,
                    tweet_num_replies: 0,
                    tweet_num_views: 10,
                    is_liked: false,
                    is_reposted: false,
                    tweet_created_at: new Date('2024-01-01'),
                    tweet_updated_at: new Date('2024-01-01'),
                    repost_id: 'repost123',
                    repost_user_id: 'repostuser123',
                    repost_user_name: 'Reposter',
                    repost_created_at: new Date('2024-01-02'),
                },
            ];

            MOCK_QUERY_BUILDER.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getReplies(tweet_id, user_id, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].reposted_by).toBeDefined();
            expect(result.tweets[0].reposted_by?.repost_id).toBe('repost123');
            expect(result.tweets[0].reposted_by?.id).toBe('repostuser123');
        });
    });

    describe('getPostsByUserId', () => {
        it('should return posts by user ID', async () => {
            const user_id = 'user123';
            const current_user_id = 'current123';
            const limit = 10;

            const mock_posts = [
                {
                    tweet_id: 'tweet1',
                    tweet_author_id: user_id,
                    type: 'tweet',
                    content: 'User post',
                    images: [],
                    videos: [],
                    num_likes: 5,
                    num_reposts: 2,
                    num_views: 50,
                    num_quotes: 1,
                    num_replies: 3,
                    created_at: new Date('2024-01-01'),
                    updated_at: new Date('2024-01-01'),
                    is_liked: true,
                    is_reposted: false,
                    post_date: new Date('2024-01-01'),
                    id: 'post1',
                    user: {
                        id: user_id,
                        username: 'testuser',
                        name: 'Test User',
                    },
                },
            ];

            MOCK_QUERY_RUNNER.query.mockResolvedValue(mock_posts);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue('next_cursor');

            const result = await repository.getPostsByUserId(
                user_id,
                current_user_id,
                undefined,
                limit
            );

            expect(result.data).toHaveLength(1);
            expect(result.data[0].tweet_id).toBe('tweet1');
            expect(result.has_more).toBe(false);
            expect(MOCK_QUERY_RUNNER.connect).toHaveBeenCalled();
            expect(MOCK_QUERY_RUNNER.release).toHaveBeenCalled();
        });

        it('should handle cursor pagination for posts', async () => {
            const user_id = 'user123';
            const cursor = '2024-01-01T00:00:00.000Z_post123';
            const limit = 10;

            MOCK_QUERY_RUNNER.query.mockResolvedValue([]);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue(null);

            const result = await repository.getPostsByUserId(user_id, undefined, cursor, limit);

            expect(MOCK_QUERY_RUNNER.query).toHaveBeenCalled();
            const query_call = MOCK_QUERY_RUNNER.query.mock.calls[0];
            expect(query_call[0]).toContain('post.post_date');
        });

        it('should handle errors in getPostsByUserId', async () => {
            const user_id = 'user123';
            const error = new Error('Database error');

            MOCK_QUERY_RUNNER.query.mockRejectedValue(error);

            await expect(repository.getPostsByUserId(user_id)).rejects.toThrow('Database error');
            expect(MOCK_QUERY_RUNNER.release).toHaveBeenCalled();
        });

        it('should include reposted_by info for reposts', async () => {
            const user_id = 'user123';
            const current_user_id = 'current123';
            const limit = 10;

            const mock_posts = [
                {
                    tweet_id: 'tweet1',
                    tweet_author_id: 'original_author',
                    type: 'tweet',
                    content: 'Original post',
                    images: [],
                    videos: [],
                    num_likes: 5,
                    num_reposts: 2,
                    num_views: 50,
                    num_quotes: 1,
                    num_replies: 3,
                    created_at: new Date('2024-01-01'),
                    updated_at: new Date('2024-01-01'),
                    is_liked: false,
                    is_reposted: true,
                    post_date: new Date('2024-01-02'),
                    id: 'repost1',
                    post_type: 'repost',
                    user: {
                        id: 'original_author',
                        username: 'originaluser',
                        name: 'Original User',
                    },
                    reposted_by_user: {
                        id: user_id,
                        username: 'reposter',
                        name: 'Reposter User',
                    },
                },
            ];

            MOCK_QUERY_RUNNER.query.mockResolvedValue(mock_posts);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue('next_cursor');

            const result = await repository.getPostsByUserId(
                user_id,
                current_user_id,
                undefined,
                limit
            );

            expect(result.data).toHaveLength(1);
            expect(result.data[0].reposted_by).toBeDefined();
            expect(result.data[0].reposted_by?.id).toBe(user_id);
            expect(result.data[0].reposted_by?.name).toBe('Reposter User');
        });
    });

    describe('getRepliesByUserId', () => {
        it('should return replies by user ID', async () => {
            const user_id = 'user123';
            const current_user_id = 'current123';
            const limit = 10;

            const mock_replies = [
                {
                    tweet_id: 'reply1',
                    user_id: user_id,
                    type: TweetType.REPLY,
                    content: 'Reply content',
                    created_at: new Date('2024-01-01'),
                    num_likes: 2,
                },
            ];

            MOCK_QUERY_BUILDER.getMany.mockResolvedValue(mock_replies);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue('next_cursor');

            const result = await repository.getRepliesByUserId(
                user_id,
                current_user_id,
                undefined,
                limit
            );

            expect(result.data).toBeDefined();
            expect(result.has_more).toBe(false);
            expect(MOCK_PAGINATION_SERVICE.applyCursorPagination).toHaveBeenCalled();
        });

        it('should handle errors in getRepliesByUserId', async () => {
            const user_id = 'user123';
            const error = new Error('Query failed');

            MOCK_QUERY_BUILDER.getMany.mockRejectedValue(error);

            await expect(repository.getRepliesByUserId(user_id)).rejects.toThrow('Query failed');
        });
    });

    describe('getMediaByUserId', () => {
        it('should return media tweets by user ID', async () => {
            const user_id = 'user123';
            const current_user_id = 'current123';
            const limit = 10;

            const mock_media_tweets = [
                {
                    tweet_id: 'tweet1',
                    user_id: user_id,
                    type: 'tweet',
                    content: 'Media tweet',
                    images: ['image1.jpg'],
                    videos: [],
                    num_likes: 10,
                    num_reposts: 5,
                    num_views: 100,
                    num_quotes: 2,
                    num_replies: 5,
                    created_at: new Date('2024-01-01'),
                    updated_at: new Date('2024-01-01'),
                    is_liked: true,
                    is_reposted: false,
                    user: {
                        id: user_id,
                        username: 'testuser',
                        name: 'Test User',
                    },
                },
            ];

            MOCK_QUERY_RUNNER.query.mockResolvedValue(mock_media_tweets);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue(null);

            const result = await repository.getMediaByUserId(
                user_id,
                current_user_id,
                undefined,
                limit
            );

            expect(result.data).toHaveLength(1);
            expect(result.data[0].images).toContain('image1.jpg');
            expect(MOCK_QUERY_RUNNER.connect).toHaveBeenCalled();
            expect(MOCK_QUERY_RUNNER.release).toHaveBeenCalled();
        });

        it('should handle cursor for media tweets', async () => {
            const user_id = 'user123';
            const cursor = '2024-01-01T00:00:00.000Z_tweet123';

            MOCK_QUERY_RUNNER.query.mockResolvedValue([]);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue(null);

            await repository.getMediaByUserId(user_id, undefined, cursor);

            expect(MOCK_QUERY_RUNNER.query).toHaveBeenCalled();
        });

        it('should handle errors in getMediaByUserId', async () => {
            const user_id = 'user123';
            const error = new Error('Media query failed');

            MOCK_QUERY_RUNNER.query.mockRejectedValue(error);

            await expect(repository.getMediaByUserId(user_id)).rejects.toThrow(
                'Media query failed'
            );
            expect(MOCK_QUERY_RUNNER.release).toHaveBeenCalled();
        });
    });

    describe('getLikedPostsByUserId', () => {
        it('should return liked posts by user ID', async () => {
            const user_id = 'user123';
            const current_user_id = 'current123';
            const limit = 10;

            const mock_liked_posts = [
                {
                    created_at: new Date('2024-01-01'),
                    tweet: {
                        tweet_id: 'tweet1',
                        user_id: 'other_user',
                        type: 'tweet',
                        content: 'Liked tweet',
                        num_likes: 50,
                    },
                },
            ];

            MOCK_QUERY_BUILDER.getMany.mockResolvedValue(mock_liked_posts);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue(null);

            const result = await repository.getLikedPostsByUserId(
                user_id,
                current_user_id,
                undefined,
                limit
            );

            expect(result.data).toBeDefined();
            expect(result.has_more).toBe(false);
            expect(MOCK_TWEET_LIKE_REPOSITORY.createQueryBuilder).toHaveBeenCalled();
        });

        it('should add interaction flags when current user is provided', async () => {
            const user_id = 'user123';
            const current_user_id = 'current123';

            MOCK_QUERY_BUILDER.getMany.mockResolvedValue([]);
            MOCK_PAGINATION_SERVICE.generateNextCursor.mockReturnValue(null);

            await repository.getLikedPostsByUserId(user_id, current_user_id);

            expect(MOCK_QUERY_BUILDER.leftJoinAndMapOne).toHaveBeenCalledTimes(3);
        });

        it('should handle errors in getLikedPostsByUserId', async () => {
            const user_id = 'user123';
            const error = new Error('Liked posts query failed');

            MOCK_QUERY_BUILDER.getMany.mockRejectedValue(error);

            await expect(repository.getLikedPostsByUserId(user_id)).rejects.toThrow(
                'Liked posts query failed'
            );
        });
    });

    describe('attachUserTweetInteractionFlags', () => {
        it('should attach interaction flags when current user is provided', () => {
            const query = MOCK_QUERY_BUILDER as any;
            const current_user_id = 'user123';

            repository.attachUserTweetInteractionFlags(query, current_user_id, 'tweet');

            expect(query.leftJoinAndMapOne).toHaveBeenCalledTimes(3);
            expect(query.leftJoinAndMapOne).toHaveBeenCalledWith(
                'tweet.current_user_like',
                TweetLike,
                'current_user_like',
                expect.any(String),
                { current_user_id: current_user_id }
            );
        });

        it('should not attach flags when current user is not provided', () => {
            const query = MOCK_QUERY_BUILDER as any;

            repository.attachUserTweetInteractionFlags(query, undefined, 'tweet');

            expect(query.leftJoinAndMapOne).not.toHaveBeenCalled();
        });

        it('should use custom alias', () => {
            const query = MOCK_QUERY_BUILDER as any;
            const current_user_id = 'user123';
            const custom_alias = 'customTweet';

            repository.attachUserTweetInteractionFlags(query, current_user_id, custom_alias);

            expect(query.leftJoinAndMapOne).toHaveBeenCalledWith(
                `${custom_alias}.current_user_like`,
                TweetLike,
                'current_user_like',
                expect.stringContaining(custom_alias),
                { current_user_id: current_user_id }
            );
        });
    });

    describe('getReplyWithParentChain', () => {
        it('should fetch reply with parent chain', async () => {
            const tweet_id = 'reply123';
            const current_user_id = 'user123';

            const mock_results = [
                {
                    tweet_id: 'reply123',
                    content: 'Reply content',
                    parent_tweet_id: 'parent123',
                },
                {
                    tweet_id: 'parent123',
                    content: 'Parent content',
                    parent_tweet_id: null,
                },
            ];

            MOCK_QUERY_RUNNER.query.mockResolvedValue(mock_results);

            const result = await repository.getReplyWithParentChain(tweet_id, current_user_id);

            expect(result).toHaveLength(2);
            expect(result[0].tweet_id).toBe('reply123');
            expect(MOCK_QUERY_RUNNER.connect).toHaveBeenCalled();
            expect(MOCK_QUERY_RUNNER.release).toHaveBeenCalled();
        });

        it('should fetch reply without current user', async () => {
            const tweet_id = 'reply123';

            MOCK_QUERY_RUNNER.query.mockResolvedValue([]);

            const result = await repository.getReplyWithParentChain(tweet_id);

            expect(MOCK_QUERY_RUNNER.query).toHaveBeenCalledWith(expect.any(String), [tweet_id]);
            expect(MOCK_QUERY_RUNNER.release).toHaveBeenCalled();
        });

        it('should handle errors in getReplyWithParentChain', async () => {
            const tweet_id = 'reply123';
            const error = new Error('Chain query failed');

            MOCK_QUERY_RUNNER.query.mockRejectedValue(error);

            await expect(repository.getReplyWithParentChain(tweet_id)).rejects.toThrow(
                'Chain query failed'
            );
            expect(MOCK_QUERY_RUNNER.release).toHaveBeenCalled();
        });
    });
});
