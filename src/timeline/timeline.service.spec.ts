import { Test, TestingModule } from '@nestjs/testing';
import { TimelineService } from './timeline.service';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { TimelinePaginationDto } from './dto/timeline-pagination.dto';
import { TweetResponseDTO } from 'src/tweets/dto/tweet-response.dto';

describe('TimelineService', () => {
    let service: TimelineService;
    let tweet_repository: jest.Mocked<TweetsRepository>;

    const mock_user_id = 'user-123';
    const mock_pagination: TimelinePaginationDto = {
        cursor: 'cursor-abc',
        limit: 20,
        since_id: undefined,
    };

    const mock_tweet_response: TweetResponseDTO = {
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

    const mock_timeline_response = {
        data: [mock_tweet_response],
        pagination: {
            next_cursor: 'next-cursor-123',
            has_more: true,
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimelineService,
                {
                    provide: TweetsRepository,
                    useValue: {
                        getFollowingTweets: jest.fn().mockResolvedValue(mock_timeline_response),
                        getForyouTweets: jest.fn().mockResolvedValue(mock_timeline_response),
                    },
                },
            ],
        }).compile();

        service = module.get<TimelineService>(TimelineService);
        tweet_repository = module.get(TweetsRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getFollowingTimeline', () => {
        it('should call tweet repository with correct parameters', async () => {
            await service.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(tweet_repository.getFollowingTweets).toHaveBeenCalledWith(
                mock_user_id,
                mock_pagination.cursor,
                mock_pagination.limit
            );
            expect(tweet_repository.getFollowingTweets).toHaveBeenCalledTimes(1);
        });

        it('should return timeline response from repository', async () => {
            const result = await service.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result).toEqual(mock_timeline_response);
            expect(result.data).toEqual(mock_timeline_response.data);
            expect(result.pagination).toEqual(mock_timeline_response.pagination);
        });

        it('should extract cursor from pagination object', async () => {
            const custom_pagination: TimelinePaginationDto = {
                cursor: 'custom-cursor',
                limit: 30,
                since_id: undefined,
            };

            await service.getFollowingTimeline(mock_user_id, custom_pagination);

            expect(tweet_repository.getFollowingTweets).toHaveBeenCalledWith(
                mock_user_id,
                'custom-cursor',
                30
            );
        });

        it('should extract limit from pagination object', async () => {
            const custom_pagination: TimelinePaginationDto = {
                cursor: 'cursor-abc',
                limit: 50,
                since_id: undefined,
            };

            await service.getFollowingTimeline(mock_user_id, custom_pagination);

            expect(tweet_repository.getFollowingTweets).toHaveBeenCalledWith(
                mock_user_id,
                'cursor-abc',
                50
            );
        });

        it('should handle undefined cursor', async () => {
            const pagination_without_cursor: TimelinePaginationDto = {
                cursor: undefined,
                limit: 20,
                since_id: undefined,
            };

            await service.getFollowingTimeline(mock_user_id, pagination_without_cursor);

            expect(tweet_repository.getFollowingTweets).toHaveBeenCalledWith(
                mock_user_id,
                undefined,
                20
            );
        });

        it('should handle undefined limit', async () => {
            const pagination_without_limit: TimelinePaginationDto = {
                cursor: 'cursor-abc',
                limit: undefined,
                since_id: undefined,
            };

            await service.getFollowingTimeline(mock_user_id, pagination_without_limit);

            expect(tweet_repository.getFollowingTweets).toHaveBeenCalledWith(
                mock_user_id,
                'cursor-abc',
                undefined
            );
        });

        it('should return empty data when no tweets available', async () => {
            const empty_response = {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            tweet_repository.getFollowingTweets.mockResolvedValue(empty_response);

            const result = await service.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result.data).toEqual([]);
            expect(result.pagination.has_more).toBe(false);
            expect(result.pagination.next_cursor).toBeNull();
        });

        it('should handle multiple tweets in response', async () => {
            const multiple_tweets_response = {
                data: [
                    mock_tweet_response,
                    { ...mock_tweet_response, tweet_id: 'tweet-2' },
                    { ...mock_tweet_response, tweet_id: 'tweet-3' },
                ],
                pagination: {
                    next_cursor: 'next-cursor-456',
                    has_more: true,
                },
            };
            tweet_repository.getFollowingTweets.mockResolvedValue(multiple_tweets_response);

            const result = await service.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result.data.length).toBe(3);
            expect(result.data[0].tweet_id).toBe('tweet-1');
            expect(result.data[1].tweet_id).toBe('tweet-2');
            expect(result.data[2].tweet_id).toBe('tweet-3');
        });

        it('should propagate errors from repository', async () => {
            const error = new Error('Database connection failed');
            tweet_repository.getFollowingTweets.mockRejectedValue(error);

            await expect(
                service.getFollowingTimeline(mock_user_id, mock_pagination)
            ).rejects.toThrow('Database connection failed');
        });

        it('should handle pagination with has_more false', async () => {
            const response_with_no_more = {
                data: [mock_tweet_response],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            tweet_repository.getFollowingTweets.mockResolvedValue(response_with_no_more);

            const result = await service.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result.pagination.next_cursor).toBeNull();
            expect(result.pagination.has_more).toBe(false);
        });

        it('should not use since_id parameter', async () => {
            const pagination_with_since_id: TimelinePaginationDto = {
                cursor: 'cursor-abc',
                limit: 20,
                since_id: 'since-tweet-123',
            };

            await service.getFollowingTimeline(mock_user_id, pagination_with_since_id);

            expect(tweet_repository.getFollowingTweets).toHaveBeenCalledWith(
                mock_user_id,
                'cursor-abc',
                20
            );
            expect(tweet_repository.getFollowingTweets).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.anything(),
                'since-tweet-123'
            );
        });

        it('should preserve response structure from repository', async () => {
            const result = await service.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(result.pagination).toHaveProperty('next_cursor');
            expect(result.pagination).toHaveProperty('has_more');
            expect(Array.isArray(result.data)).toBe(true);
        });
    });

    describe('getForyouTimeline', () => {
        it('should call tweet repository with correct parameters', async () => {
            await service.getForyouTimeline(mock_user_id, mock_pagination);

            expect(tweet_repository.getForyouTweets).toHaveBeenCalledWith(
                mock_user_id,
                mock_pagination.cursor,
                mock_pagination.limit
            );
            expect(tweet_repository.getForyouTweets).toHaveBeenCalledTimes(1);
        });

        it('should return timeline response from repository', async () => {
            const result = await service.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result).toEqual(mock_timeline_response);
            expect(result.data).toEqual(mock_timeline_response.data);
            expect(result.pagination).toEqual(mock_timeline_response.pagination);
        });

        it('should extract cursor from pagination object', async () => {
            const custom_pagination: TimelinePaginationDto = {
                cursor: 'custom-cursor',
                limit: 30,
                since_id: undefined,
            };

            await service.getForyouTimeline(mock_user_id, custom_pagination);

            expect(tweet_repository.getForyouTweets).toHaveBeenCalledWith(
                mock_user_id,
                'custom-cursor',
                30
            );
        });

        it('should extract limit from pagination object', async () => {
            const custom_pagination: TimelinePaginationDto = {
                cursor: 'cursor-abc',
                limit: 50,
                since_id: undefined,
            };

            await service.getForyouTimeline(mock_user_id, custom_pagination);

            expect(tweet_repository.getForyouTweets).toHaveBeenCalledWith(
                mock_user_id,
                'cursor-abc',
                50
            );
        });

        it('should handle undefined cursor', async () => {
            const pagination_without_cursor: TimelinePaginationDto = {
                cursor: undefined,
                limit: 20,
                since_id: undefined,
            };

            await service.getForyouTimeline(mock_user_id, pagination_without_cursor);

            expect(tweet_repository.getForyouTweets).toHaveBeenCalledWith(
                mock_user_id,
                undefined,
                20
            );
        });

        it('should handle undefined limit', async () => {
            const pagination_without_limit: TimelinePaginationDto = {
                cursor: 'cursor-abc',
                limit: undefined,
                since_id: undefined,
            };

            await service.getForyouTimeline(mock_user_id, pagination_without_limit);

            expect(tweet_repository.getForyouTweets).toHaveBeenCalledWith(
                mock_user_id,
                'cursor-abc',
                undefined
            );
        });

        it('should return empty data when no tweets available', async () => {
            const empty_response = {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            tweet_repository.getForyouTweets.mockResolvedValue(empty_response);

            const result = await service.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result.data).toEqual([]);
            expect(result.pagination.has_more).toBe(false);
            expect(result.pagination.next_cursor).toBeNull();
        });

        it('should handle multiple tweets in response', async () => {
            const multiple_tweets_response = {
                data: [
                    mock_tweet_response,
                    { ...mock_tweet_response, tweet_id: 'tweet-2' },
                    { ...mock_tweet_response, tweet_id: 'tweet-3' },
                ],
                pagination: {
                    next_cursor: 'next-cursor-789',
                    has_more: true,
                },
            };
            tweet_repository.getForyouTweets.mockResolvedValue(multiple_tweets_response);

            const result = await service.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result.data.length).toBe(3);
            expect(result.data[0].tweet_id).toBe('tweet-1');
            expect(result.data[1].tweet_id).toBe('tweet-2');
            expect(result.data[2].tweet_id).toBe('tweet-3');
        });

        it('should propagate errors from repository', async () => {
            const error = new Error('Repository error');
            tweet_repository.getForyouTweets.mockRejectedValue(error);

            await expect(service.getForyouTimeline(mock_user_id, mock_pagination)).rejects.toThrow(
                'Repository error'
            );
        });

        it('should handle pagination with has_more false', async () => {
            const response_with_no_more = {
                data: [mock_tweet_response],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            tweet_repository.getForyouTweets.mockResolvedValue(response_with_no_more);

            const result = await service.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result.pagination.next_cursor).toBeNull();
            expect(result.pagination.has_more).toBe(false);
        });
    });
});
