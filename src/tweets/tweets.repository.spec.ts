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
    let tweetRepository: Repository<Tweet>;
    let tweetLikeRepository: Repository<TweetLike>;
    let tweetRepostRepository: Repository<TweetRepost>;
    let paginationService: PaginationService;
    let dataSource: DataSource;

    const mockQueryBuilder = {
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

    const mockTweetRepository = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockTweetLikeRepository = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockTweetRepostRepository = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockPaginationService = {
        applyCursorPagination: jest.fn(),
        generateNextCursor: jest.fn(),
    };

    const mockQueryRunner = {
        connect: jest.fn(),
        query: jest.fn(),
        release: jest.fn(),
    };

    const mockDataSource = {
        createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TweetsRepository,
                { provide: getRepositoryToken(Tweet), useValue: mockTweetRepository },
                { provide: getRepositoryToken(TweetLike), useValue: mockTweetLikeRepository },
                { provide: getRepositoryToken(TweetRepost), useValue: mockTweetRepostRepository },
                { provide: PaginationService, useValue: mockPaginationService },
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile();

        repository = module.get<TweetsRepository>(TweetsRepository);
        tweetRepository = module.get<Repository<Tweet>>(getRepositoryToken(Tweet));
        tweetLikeRepository = module.get<Repository<TweetLike>>(getRepositoryToken(TweetLike));
        tweetRepostRepository = module.get<Repository<TweetRepost>>(getRepositoryToken(TweetRepost));
        paginationService = module.get<PaginationService>(PaginationService);
        dataSource = module.get<DataSource>(DataSource);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('getFollowingTweets', () => {
        it('should return following tweets with pagination', async () => {
            const userId = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const rawResults = [
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

            mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

            const result = await repository.getFollowingTweets(userId, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].tweet_id).toBe('tweet1');
            expect(result.tweets[0].content).toBe('Hello world');
            expect(result.tweets[0].is_liked).toBe(true);
            expect(mockTweetRepository.createQueryBuilder).toHaveBeenCalled();
        });

        it('should handle cursor pagination', async () => {
            const userId = 'user123';
            const pagination: TimelinePaginationDto = {
                limit: 10,
                cursor: '2024-01-01T00:00:00.000Z_tweet123',
            };

            mockQueryBuilder.getRawMany.mockResolvedValue([]);

            await repository.getFollowingTweets(userId, pagination);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('tweet.created_at'),
                expect.objectContaining({
                    cursor_timestamp: '2024-01-01T00:00:00.000Z',
                    cursor_id: 'tweet123',
                })
            );
        });

        it('should return next_cursor when limit is reached', async () => {
            const userId = 'user123';
            const pagination: TimelinePaginationDto = { limit: 2 };

            const rawResults = [
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

            mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

            const result = await repository.getFollowingTweets(userId, pagination);

            expect(result.next_cursor).toContain('tweet2');
        });

        it('should handle reposted tweets', async () => {
            const userId = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const rawResults = [
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

            mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

            const result = await repository.getFollowingTweets(userId, pagination);

            expect(result.tweets[0].reposted_by).toBeDefined();
            expect(result.tweets[0].reposted_by.id).toBe('reposter1');
            expect(result.tweets[0].reposted_by.name).toBe('Reposter');
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

            mockQueryBuilder.getRawMany.mockResolvedValue(raw_results);

            const result = await repository.getFollowingTweets(user_id, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].parent_tweet_id).toBe('parent123');
            expect(result.tweets[0].tweet_id).toBe('reply1');
        });
    });

    describe('getForyouTweets', () => {
        it('should return random tweets for you feed', async () => {
            const userId = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const rawResults = [
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

            mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

            const result = await repository.getForyouTweets(userId, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].content).toBe('Random tweet');
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('RANDOM()');
        });

        it('should handle cursor in for you feed', async () => {
            const userId = 'user123';
            const pagination: TimelinePaginationDto = {
                limit: 10,
                cursor: '2024-01-01T00:00:00.000Z_tweet123',
            };

            mockQueryBuilder.getRawMany.mockResolvedValue([]);

            await repository.getForyouTweets(userId, pagination);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
        });
    });

    describe('getReplies', () => {
        it('should return replies for a tweet', async () => {
            const tweetId = 'tweet123';
            const userId = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const rawResults = [
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
                    parent_tweet_id: tweetId,
                },
            ];

            mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

            const result = await repository.getReplies(tweetId, userId, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].type).toBe('reply');
            expect(result.tweets[0].parent_tweet_id).toBe(tweetId);
        });

        it('should apply cursor pagination for replies', async () => {
            const tweetId = 'tweet123';
            const userId = 'user123';
            const pagination: TimelinePaginationDto = {
                limit: 10,
                cursor: '2024-01-01T00:00:00.000Z_reply123',
            };

            mockQueryBuilder.getRawMany.mockResolvedValue([]);

            await repository.getReplies(tweetId, userId, pagination);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('tweet.created_at'),
                expect.any(Object)
            );
        });

        it('should include parent tweet info when available', async () => {
            const tweetId = 'tweet123';
            const userId = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const rawResults = [
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

            mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

            const result = await repository.getReplies(tweetId, userId, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].parent_tweet_id).toBe('parent123');
            expect(result.tweets[0].parent_tweet_id).toBeDefined();
            expect(result.tweets[0].tweet_id).toBe('reply1');
        });

        it('should include reposted_by info when available', async () => {
            const tweetId = 'tweet123';
            const userId = 'user123';
            const pagination: TimelinePaginationDto = { limit: 10 };

            const rawResults = [
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

            mockQueryBuilder.getRawMany.mockResolvedValue(rawResults);

            const result = await repository.getReplies(tweetId, userId, pagination);

            expect(result.tweets).toHaveLength(1);
            expect(result.tweets[0].reposted_by).toBeDefined();
            expect(result.tweets[0].reposted_by.repost_id).toBe('repost123');
            expect(result.tweets[0].reposted_by.id).toBe('repostuser123');
        });
    });

    describe('getPostsByUserId', () => {
        it('should return posts by user ID', async () => {
            const userId = 'user123';
            const currentUserId = 'current123';
            const limit = 10;

            const mockPosts = [
                {
                    tweet_id: 'tweet1',
                    tweet_author_id: userId,
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
                        id: userId,
                        username: 'testuser',
                        name: 'Test User',
                    },
                },
            ];

            mockQueryRunner.query.mockResolvedValue(mockPosts);
            mockPaginationService.generateNextCursor.mockReturnValue('next_cursor');

            const result = await repository.getPostsByUserId(userId, currentUserId, undefined, limit);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].tweet_id).toBe('tweet1');
            expect(result.has_more).toBe(false);
            expect(mockQueryRunner.connect).toHaveBeenCalled();
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });

        it('should handle cursor pagination for posts', async () => {
            const userId = 'user123';
            const cursor = '2024-01-01T00:00:00.000Z_post123';
            const limit = 10;

            mockQueryRunner.query.mockResolvedValue([]);
            mockPaginationService.generateNextCursor.mockReturnValue(null);

            const result = await repository.getPostsByUserId(userId, undefined, cursor, limit);

            expect(mockQueryRunner.query).toHaveBeenCalled();
            const queryCall = mockQueryRunner.query.mock.calls[0];
            expect(queryCall[0]).toContain('post.post_date');
        });

        it('should handle errors in getPostsByUserId', async () => {
            const userId = 'user123';
            const error = new Error('Database error');

            mockQueryRunner.query.mockRejectedValue(error);

            await expect(repository.getPostsByUserId(userId)).rejects.toThrow('Database error');
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });

        it('should include reposted_by info for reposts', async () => {
            const userId = 'user123';
            const currentUserId = 'current123';
            const limit = 10;

            const mockPosts = [
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
                        id: userId,
                        username: 'reposter',
                        name: 'Reposter User',
                    },
                },
            ];

            mockQueryRunner.query.mockResolvedValue(mockPosts);
            mockPaginationService.generateNextCursor.mockReturnValue('next_cursor');

            const result = await repository.getPostsByUserId(userId, currentUserId, undefined, limit);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].reposted_by).toBeDefined();
            expect(result.data[0].reposted_by.id).toBe(userId);
            expect(result.data[0].reposted_by.name).toBe('Reposter User');
        });
    });

    describe('getRepliesByUserId', () => {
        it('should return replies by user ID', async () => {
            const userId = 'user123';
            const currentUserId = 'current123';
            const limit = 10;

            const mockReplies = [
                {
                    tweet_id: 'reply1',
                    user_id: userId,
                    type: TweetType.REPLY,
                    content: 'Reply content',
                    created_at: new Date('2024-01-01'),
                    num_likes: 2,
                },
            ];

            mockQueryBuilder.getMany.mockResolvedValue(mockReplies);
            mockPaginationService.generateNextCursor.mockReturnValue('next_cursor');

            const result = await repository.getRepliesByUserId(userId, currentUserId, undefined, limit);

            expect(result.data).toBeDefined();
            expect(result.has_more).toBe(false);
            expect(mockPaginationService.applyCursorPagination).toHaveBeenCalled();
        });

        it('should handle errors in getRepliesByUserId', async () => {
            const userId = 'user123';
            const error = new Error('Query failed');

            mockQueryBuilder.getMany.mockRejectedValue(error);

            await expect(repository.getRepliesByUserId(userId)).rejects.toThrow('Query failed');
        });
    });

    describe('getMediaByUserId', () => {
        it('should return media tweets by user ID', async () => {
            const userId = 'user123';
            const currentUserId = 'current123';
            const limit = 10;

            const mockMediaTweets = [
                {
                    tweet_id: 'tweet1',
                    user_id: userId,
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
                        id: userId,
                        username: 'testuser',
                        name: 'Test User',
                    },
                },
            ];

            mockQueryRunner.query.mockResolvedValue(mockMediaTweets);
            mockPaginationService.generateNextCursor.mockReturnValue(null);

            const result = await repository.getMediaByUserId(userId, currentUserId, undefined, limit);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].images).toContain('image1.jpg');
            expect(mockQueryRunner.connect).toHaveBeenCalled();
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });

        it('should handle cursor for media tweets', async () => {
            const userId = 'user123';
            const cursor = '2024-01-01T00:00:00.000Z_tweet123';

            mockQueryRunner.query.mockResolvedValue([]);
            mockPaginationService.generateNextCursor.mockReturnValue(null);

            await repository.getMediaByUserId(userId, undefined, cursor);

            expect(mockQueryRunner.query).toHaveBeenCalled();
        });

        it('should handle errors in getMediaByUserId', async () => {
            const userId = 'user123';
            const error = new Error('Media query failed');

            mockQueryRunner.query.mockRejectedValue(error);

            await expect(repository.getMediaByUserId(userId)).rejects.toThrow('Media query failed');
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });
    });

    describe('getLikedPostsByUserId', () => {
        it('should return liked posts by user ID', async () => {
            const userId = 'user123';
            const currentUserId = 'current123';
            const limit = 10;

            const mockLikedPosts = [
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

            mockQueryBuilder.getMany.mockResolvedValue(mockLikedPosts);
            mockPaginationService.generateNextCursor.mockReturnValue(null);

            const result = await repository.getLikedPostsByUserId(userId, currentUserId, undefined, limit);

            expect(result.data).toBeDefined();
            expect(result.has_more).toBe(false);
            expect(mockTweetLikeRepository.createQueryBuilder).toHaveBeenCalled();
        });

        it('should add interaction flags when current user is provided', async () => {
            const userId = 'user123';
            const currentUserId = 'current123';

            mockQueryBuilder.getMany.mockResolvedValue([]);
            mockPaginationService.generateNextCursor.mockReturnValue(null);

            await repository.getLikedPostsByUserId(userId, currentUserId);

            expect(mockQueryBuilder.leftJoinAndMapOne).toHaveBeenCalledTimes(3);
        });

        it('should handle errors in getLikedPostsByUserId', async () => {
            const userId = 'user123';
            const error = new Error('Liked posts query failed');

            mockQueryBuilder.getMany.mockRejectedValue(error);

            await expect(repository.getLikedPostsByUserId(userId)).rejects.toThrow(
                'Liked posts query failed'
            );
        });
    });

    describe('attachUserTweetInteractionFlags', () => {
        it('should attach interaction flags when current user is provided', () => {
            const query = mockQueryBuilder as any;
            const currentUserId = 'user123';

            repository.attachUserTweetInteractionFlags(query, currentUserId, 'tweet');

            expect(query.leftJoinAndMapOne).toHaveBeenCalledTimes(3);
            expect(query.leftJoinAndMapOne).toHaveBeenCalledWith(
                'tweet.current_user_like',
                TweetLike,
                'current_user_like',
                expect.any(String),
                { current_user_id: currentUserId }
            );
        });

        it('should not attach flags when current user is not provided', () => {
            const query = mockQueryBuilder as any;

            repository.attachUserTweetInteractionFlags(query, undefined, 'tweet');

            expect(query.leftJoinAndMapOne).not.toHaveBeenCalled();
        });

        it('should use custom alias', () => {
            const query = mockQueryBuilder as any;
            const currentUserId = 'user123';
            const customAlias = 'customTweet';

            repository.attachUserTweetInteractionFlags(query, currentUserId, customAlias);

            expect(query.leftJoinAndMapOne).toHaveBeenCalledWith(
                `${customAlias}.current_user_like`,
                TweetLike,
                'current_user_like',
                expect.stringContaining(customAlias),
                { current_user_id: currentUserId }
            );
        });
    });

    describe('getReplyWithParentChain', () => {
        it('should fetch reply with parent chain', async () => {
            const tweetId = 'reply123';
            const currentUserId = 'user123';

            const mockResults = [
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

            mockQueryRunner.query.mockResolvedValue(mockResults);

            const result = await repository.getReplyWithParentChain(tweetId, currentUserId);

            expect(result).toHaveLength(2);
            expect(result[0].tweet_id).toBe('reply123');
            expect(mockQueryRunner.connect).toHaveBeenCalled();
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });

        it('should fetch reply without current user', async () => {
            const tweetId = 'reply123';

            mockQueryRunner.query.mockResolvedValue([]);

            const result = await repository.getReplyWithParentChain(tweetId);

            expect(mockQueryRunner.query).toHaveBeenCalledWith(expect.any(String), [tweetId]);
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });

        it('should handle errors in getReplyWithParentChain', async () => {
            const tweetId = 'reply123';
            const error = new Error('Chain query failed');

            mockQueryRunner.query.mockRejectedValue(error);

            await expect(repository.getReplyWithParentChain(tweetId)).rejects.toThrow(
                'Chain query failed'
            );
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });
    });
});
