import { Test, TestingModule } from '@nestjs/testing';
import { TimelineService } from './timeline.service';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { TimelinePaginationDto } from './dto/timeline-pagination.dto';
import { TweetResponseDTO } from 'src/tweets/dto/tweet-response.dto';
import { TweetType } from 'src/shared/enums/tweet-types.enum';
import { RepostedByUserDTO, UserResponseDTO } from 'src/tweets/dto';

describe('TimelineService', () => {
    let service: TimelineService;
    let tweets_repo: jest.MockedObject<TweetsRepository>;

    const mock_tweets_repository = {
        getFollowingTweets: jest.fn(),
        getForyouTweets: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimelineService,
                {
                    provide: TweetsRepository,
                    useValue: mock_tweets_repository,
                },
            ],
        }).compile();

        service = module.get<TimelineService>(TimelineService);
        tweets_repo = module.get(TweetsRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getFollowingTimeline', () => {
        const user_id = 'user-123';
        const pagination: TimelinePaginationDto = {
            limit: 10,
            cursor: null,
        };

        const user_response: UserResponseDTO = {
            id: 'user-456',
            username: 'amira',
            name: 'Amira',
            verified: true,
            avatar_url: 'https://example.com/avatar.jpg',
            bio: 'Software developer and tech enthusiast',
            followers: 1250,
            following: 340,
            is_following: true,
            cover_url: 'https://example.com/cover.jpg',
        };

        const parent_tweet: TweetResponseDTO = {
            tweet_id: 'tweet-parent-789',
            content: 'This is the original tweet being replied to',
            type: TweetType.TWEET,
            images: ['https://example.com/image1.jpg'],
            videos: [],
            user: user_response,
            likes_count: 245,
            reposts_count: 67,
            replies_count: 34,
            quotes_count: 12,
            views_count: 5420,
            is_liked: false,
            is_reposted: false,
            created_at: new Date('2024-11-01T10:00:00Z'),
            updated_at: new Date('2024-11-01T10:00:00Z'),
        };

        const reposted_by: RepostedByUserDTO = {
            repost_id: 'repost-999',
            id: 'user-repost-111',
            name: 'Nada',
            reposted_at: new Date('2024-11-02T08:30:00Z'),
        };

        const mock_tweets: TweetResponseDTO[] = [
            {
                tweet_id: 'tweet-reply-001',
                content: 'Great point! I completely agree with this perspective.',
                type: TweetType.REPLY,
                images: [],
                videos: [],
                parent_tweet_id: 'tweet-parent-789',
                user: {
                    id: 'user-789',
                    username: 'techguru',
                    name: 'Tech Guru',
                    verified: false,
                    avatar_url: 'https://example.com/tech-avatar.jpg',
                    bio: 'Technology analyst',
                    followers: 3400,
                    following: 890,
                    is_following: true,
                    cover_url: 'https://example.com/tech-cover.jpg',
                },
                parent_tweet: parent_tweet,
                reposted_by: reposted_by,
                likes_count: 89,
                reposts_count: 23,
                replies_count: 12,
                quotes_count: 5,
                views_count: 1820,
                is_liked: true,
                is_reposted: false,
                created_at: new Date('2024-11-02T09:15:00Z'),
                updated_at: new Date('2024-11-02T09:15:00Z'),
            },
        ];

        it('should return timeline with tweets when tweets exist', async () => {
            const mock_response = {
                tweets: mock_tweets,
                next_cursor: 'cursor-123',
            };

            tweets_repo.getFollowingTweets.mockResolvedValue(mock_response);
            const result = await service.getFollowingTimeline(user_id, pagination);

            expect(tweets_repo.getFollowingTweets).toHaveBeenCalledWith(user_id, pagination);
            expect(result).toMatchObject({
                tweets: mock_tweets,
                next_cursor: 'cursor-123',
                has_more: false,
                count: 1,
            });
        });

        it('should set has_more to true when tweets length equals limit', async () => {
            const full_page_tweets: TweetResponseDTO[] = Array(10)
                .fill(null)
                .map((_, i) => ({
                    tweet_id: `tweet-${i}`,
                    content: `This is test tweet number ${i + 1}`,
                    type: TweetType.TWEET,
                    images: [],
                    videos: [],
                    user: user_response,
                    conversation_id: `conv-${i}`,
                    likes_count: Math.floor(Math.random() * 100),
                    reposts_count: Math.floor(Math.random() * 50),
                    replies_count: Math.floor(Math.random() * 30),
                    quotes_count: Math.floor(Math.random() * 10),
                    views_count: Math.floor(Math.random() * 1000),
                    is_liked: i % 2 === 0,
                    is_reposted: i % 3 === 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                })) as TweetResponseDTO[];

            const mock_response = {
                tweets: full_page_tweets,
                next_cursor: 'cursor-next-page',
            };

            tweets_repo.getFollowingTweets.mockResolvedValue(mock_response);
            const result = await service.getFollowingTimeline(user_id, pagination);

            expect(result.has_more).toBe(true);
            expect(result.count).toBe(10);
        });

        it('should return empty timeline when no tweets exist', async () => {
            const mock_response = {
                tweets: [],
                next_cursor: null,
            };
            tweets_repo.getFollowingTweets.mockResolvedValue(mock_response);
            const result = await service.getFollowingTimeline(user_id, pagination);

            expect(result).toMatchObject({
                tweets: [],
                has_more: false,
                next_cursor: null,
                count: 0,
            });
        });

        it('should handle pagination with cursor', async () => {
            const pagination_with_cursor: TimelinePaginationDto = {
                limit: 10,
                cursor: 'existing-cursor-abc123',
            };
            const mock_response = {
                tweets: mock_tweets,
                next_cursor: 'next-cursor-def456',
            };
            tweets_repo.getFollowingTweets.mockResolvedValue(mock_response);
            const result = await service.getFollowingTimeline(user_id, pagination_with_cursor);

            expect(tweets_repo.getFollowingTweets).toHaveBeenCalledWith(
                user_id,
                pagination_with_cursor
            );
        });
    });

    ////////////////////////////////////////////////////////////////////////
    ////////////////////////For You Timeline////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    describe('getForyouTimeline', () => {
        const user_id = 'user-123';
        const pagination: TimelinePaginationDto = {
            limit: 10,
            cursor: null,
        };

        const user_response: UserResponseDTO = {
            id: 'user-456',
            username: 'johndoe',
            name: 'AMira',
            verified: true,
            avatar_url: 'https://example.com/avatar.jpg',
            bio: 'Software developer and tech enthusiast',
            followers: 1250,
            following: 340,
            is_following: true,
            cover_url: 'https://example.com/cover.jpg',
        };

        const parent_tweet: TweetResponseDTO = {
            tweet_id: 'tweet-parent-789',
            content: 'This is the original tweet being replied to',
            type: TweetType.TWEET,
            images: ['https://example.com/image1.jpg'],
            videos: [],
            user: user_response,
            likes_count: 245,
            reposts_count: 67,
            replies_count: 34,
            quotes_count: 12,
            views_count: 5420,
            is_liked: false,
            is_reposted: false,
            created_at: new Date('2024-11-01T10:00:00Z'),
            updated_at: new Date('2024-11-01T10:00:00Z'),
        };

        const reposted_by: RepostedByUserDTO = {
            repost_id: 'repost-999',
            id: 'user-repost-111',
            name: 'Nada',
            reposted_at: new Date('2024-11-02T08:30:00Z'),
        };

        const mock_tweets: TweetResponseDTO[] = [
            {
                tweet_id: 'tweet-foryou-001',
                content: 'Trending topic: The future of AI and machine learning',
                type: TweetType.TWEET,
                images: ['https://example.com/ai-image.jpg'],
                videos: [],
                user: {
                    id: 'user-trending-999',
                    username: 'aithinker',
                    name: 'AI Thinker',
                    verified: true,
                    avatar_url: 'https://example.com/ai-avatar.jpg',
                    bio: 'AI researcher and educator',
                    followers: 8900,
                    following: 450,
                    is_following: false,
                    cover_url: 'https://example.com/ai-cover.jpg',
                },
                reposted_by: reposted_by,
                likes_count: 567,
                reposts_count: 189,
                replies_count: 78,
                quotes_count: 34,
                views_count: 15600,
                is_liked: true,
                is_reposted: true,
                created_at: new Date('2024-11-02T07:00:00Z'),
                updated_at: new Date('2024-11-02T07:00:00Z'),
            },
        ];

        it('should return timeline with tweets when tweets exist', async () => {
            const mock_response = {
                tweets: mock_tweets,
                next_cursor: 'cursor-foryou-456',
            };

            tweets_repo.getForyouTweets.mockResolvedValue(mock_response);
            const result = await service.getForyouTimeline(user_id, pagination);

            expect(tweets_repo.getForyouTweets).toHaveBeenCalledWith(user_id, pagination);
            expect(result).toMatchObject({
                tweets: mock_tweets,
                next_cursor: 'cursor-foryou-456',
                has_more: false,
                count: 1,
            });
        });

        it('should set has_more to true when tweets length equals limit', async () => {
            const full_page_tweets: TweetResponseDTO[] = Array(10)
                .fill(null)
                .map((_, i) => ({
                    tweet_id: `tweet-foryou-${i}`,
                    content: `Trending tweet ${i + 1}: Interesting content for you`,
                    type: TweetType.TWEET,
                    images: i % 2 === 0 ? [`https://example.com/image-${i}.jpg`] : [],
                    videos: [],
                    user: {
                        id: `user-trending-${i}`,
                        username: `trenduser${i}`,
                        name: `Trending User ${i}`,
                        verified: i % 3 === 0,
                        avatar_url: `https://example.com/avatar-${i}.jpg`,
                        bio: `Bio for trending user ${i}`,
                        followers: Math.floor(Math.random() * 10000),
                        following: Math.floor(Math.random() * 1000),
                        is_following: i % 2 === 0,
                        cover_url: `https://example.com/cover-${i}.jpg`,
                    },
                    conversation_id: `conv-foryou-${i}`,
                    likes_count: Math.floor(Math.random() * 500),
                    reposts_count: Math.floor(Math.random() * 200),
                    replies_count: Math.floor(Math.random() * 100),
                    quotes_count: Math.floor(Math.random() * 50),
                    views_count: Math.floor(Math.random() * 10000),
                    is_liked: i % 2 === 0,
                    is_reposted: i % 3 === 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                })) as TweetResponseDTO[];

            const mock_response = {
                tweets: full_page_tweets,
                next_cursor: 'cursor-foryou-next',
            };

            tweets_repo.getForyouTweets.mockResolvedValue(mock_response);
            const result = await service.getForyouTimeline(user_id, pagination);

            expect(result.has_more).toBe(true);
            expect(result.count).toBe(10);
        });

        it('should return empty timeline when no tweets exist', async () => {
            const mock_response = {
                tweets: [],
                next_cursor: null,
            };
            tweets_repo.getForyouTweets.mockResolvedValue(mock_response);
            const result = await service.getForyouTimeline(user_id, pagination);

            expect(result).toMatchObject({
                tweets: [],
                has_more: false,
                next_cursor: null,
                count: 0,
            });
        });

        it('should handle pagination with cursor', async () => {
            const pagination_with_cursor: TimelinePaginationDto = {
                limit: 10,
                cursor: 'existing-cursor-foryou-xyz',
            };
            const mock_response = {
                tweets: mock_tweets,
                next_cursor: 'next-cursor-foryou-abc',
            };
            tweets_repo.getForyouTweets.mockResolvedValue(mock_response);
            const result = await service.getForyouTimeline(user_id, pagination_with_cursor);

            expect(tweets_repo.getForyouTweets).toHaveBeenCalledWith(
                user_id,
                pagination_with_cursor
            );
        });
    });
});
