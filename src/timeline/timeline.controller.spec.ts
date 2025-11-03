import { Test, TestingModule } from '@nestjs/testing';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { TimelinePaginationDto } from './dto/timeline-pagination.dto';
import { UserResponseDTO } from 'src/tweets/dto/user-response.dto';
import { RepostedByUserDTO, TweetResponseDTO } from 'src/tweets/dto';
import { TimelineResponseDto } from './dto/timeline-response.dto';

describe('TimelineController', () => {
    let controller: TimelineController;
    let service: jest.MockedObject<TimelineService>;

    const mock_service = {
        getFollowingTimeline: jest.fn(),
        getForyouTimeline: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TimelineController],
            providers: [
                {
                    provide: TimelineService,
                    useValue: mock_service,
                },
            ],
        }).compile();

        controller = module.get<TimelineController>(TimelineController);
        service = module.get(TimelineService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /following', () => {
        const user_id = 'user-1';
        const pagination: TimelinePaginationDto = {
            limit: 10,
            cursor: null,
        };
        it('should return following timeline successfully', async () => {
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
                type: 'tweet',
                images: ['https://example.com/image1.jpg'],
                videos: [],
                user: user_response,
                conversation_id: 'conv-123',
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
                    type: 'reply',
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
                    conversation_id: 'conv-123',
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
            const mock_response: TimelineResponseDto = {
                tweets: mock_tweets,
                next_cursor: 'cursor-following-123',
                has_more: false,
                timestamp: new Date().toISOString(),
                count: 1,
            };

            service.getFollowingTimeline.mockResolvedValue(mock_response);

            const result = await controller.getFollowingTimeline(user_id, pagination);

            expect(service.getFollowingTimeline).toHaveBeenCalledWith(user_id, pagination);
            expect(service.getFollowingTimeline).toHaveBeenCalledTimes(1);
            expect(result.has_more).toBe(false);
        });

        it('should return empty timeline when user follows no one or did not post anything', async () => {
            const mock_response: TimelineResponseDto = {
                tweets: [],
                next_cursor: null,
                has_more: false,
                timestamp: new Date().toISOString(),
                count: 0,
            };

            service.getFollowingTimeline.mockResolvedValue(mock_response);

            const result = await controller.getFollowingTimeline(user_id, pagination);

            expect(service.getFollowingTimeline).toHaveBeenCalledWith(user_id, pagination);
            expect(result.tweets).toHaveLength(0);
            expect(result.has_more).toBe(false);
            expect(result.next_cursor).toBeNull();
        });

        //TODO: More tests to be added
    });
    describe('GET / For-you', () => {
        const user_id = 'user-1';
        const pagination: TimelinePaginationDto = {
            limit: 10,
            cursor: null,
        };
        it('should return for you timeline successfully', async () => {
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
                type: 'tweet',
                images: ['https://example.com/image1.jpg'],
                videos: [],
                user: user_response,
                conversation_id: 'conv-123',
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
                    type: 'reply',
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
                    conversation_id: 'conv-123',
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
            const mock_response: TimelineResponseDto = {
                tweets: mock_tweets,
                next_cursor: 'cursor-following-123',
                has_more: false,
                timestamp: new Date().toISOString(),
                count: 1,
            };

            service.getForyouTimeline.mockResolvedValue(mock_response);

            const result = await controller.getForyouTimeline(user_id, pagination);

            expect(service.getForyouTimeline).toHaveBeenCalledWith(user_id, pagination);
            expect(service.getForyouTimeline).toHaveBeenCalledTimes(1);
            expect(result.has_more).toBe(false);
        });

        it('should return empty timeline when no tweets exist', async () => {
            const mock_response: TimelineResponseDto = {
                tweets: [],
                next_cursor: null,
                has_more: false,
                timestamp: new Date().toISOString(),
                count: 0,
            };

            service.getForyouTimeline.mockResolvedValue(mock_response);

            const result = await controller.getForyouTimeline(user_id, pagination);

            expect(service.getForyouTimeline).toHaveBeenCalledWith(user_id, pagination);
            expect(result.tweets).toHaveLength(0);
            expect(result.has_more).toBe(false);
            expect(result.next_cursor).toBeNull();
        });

        //TODO: More tests to be added
    });
});
