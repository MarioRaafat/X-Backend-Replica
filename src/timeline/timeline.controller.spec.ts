import { Test, TestingModule } from '@nestjs/testing';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { ForyouService } from './services/foryou/for-you.service';
import { TimelinePaginationDto } from './dto/timeline-pagination.dto';
import { ScoredCandidateDTO } from './dto/scored-candidates.dto';

describe('TimelineController', () => {
    let controller: TimelineController;
    let timeline_service: jest.Mocked<TimelineService>;
    let foryou_service: jest.Mocked<ForyouService>;

    const mock_user_id = 'user-123';
    const mock_pagination: TimelinePaginationDto = {
        cursor: 'cursor-abc',
        limit: 20,
        since_id: undefined,
    };

    const mock_scored_candidate: ScoredCandidateDTO = {
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
        data: [mock_scored_candidate],
        pagination: {
            next_cursor: 'next-cursor-123',
            has_more: true,
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TimelineController],
            providers: [
                {
                    provide: TimelineService,
                    useValue: {
                        getFollowingTimeline: jest.fn().mockResolvedValue(mock_timeline_response),
                    },
                },
                {
                    provide: ForyouService,
                    useValue: {
                        getForyouTimeline: jest.fn().mockResolvedValue(mock_timeline_response),
                    },
                },
            ],
        }).compile();

        controller = module.get<TimelineController>(TimelineController);
        timeline_service = module.get(TimelineService);
        foryou_service = module.get(ForyouService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getForyouTimeline', () => {
        it('should call foryou service with correct parameters', async () => {
            await controller.getForyouTimeline(mock_user_id, mock_pagination);

            expect(foryou_service.getForyouTimeline).toHaveBeenCalledWith(
                mock_user_id,
                mock_pagination.cursor,
                mock_pagination.limit
            );
            expect(foryou_service.getForyouTimeline).toHaveBeenCalledTimes(1);
        });

        it('should return timeline response from foryou service', async () => {
            const result = await controller.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result).toEqual(mock_timeline_response);
            expect(result.data).toEqual(mock_timeline_response.data);
            expect(result.pagination).toEqual(mock_timeline_response.pagination);
        });

        it('should pass user_id from decorator', async () => {
            await controller.getForyouTimeline(mock_user_id, mock_pagination);

            expect(foryou_service.getForyouTimeline).toHaveBeenCalledWith(
                mock_user_id,
                expect.any(String),
                expect.any(Number)
            );
        });

        it('should pass pagination cursor correctly', async () => {
            const custom_pagination: TimelinePaginationDto = {
                cursor: 'custom-cursor',
                limit: 30,
                since_id: undefined,
            };

            await controller.getForyouTimeline(mock_user_id, custom_pagination);

            expect(foryou_service.getForyouTimeline).toHaveBeenCalledWith(
                mock_user_id,
                'custom-cursor',
                30
            );
        });

        it('should handle undefined cursor', async () => {
            const pagination_without_cursor: TimelinePaginationDto = {
                cursor: undefined,
                limit: 20,
                since_id: undefined,
            };

            await controller.getForyouTimeline(mock_user_id, pagination_without_cursor);

            expect(foryou_service.getForyouTimeline).toHaveBeenCalledWith(
                mock_user_id,
                undefined,
                20
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
            foryou_service.getForyouTimeline.mockResolvedValue(empty_response);

            const result = await controller.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result.data).toEqual([]);
            expect(result.pagination.has_more).toBe(false);
        });

        it('should handle multiple tweets in response', async () => {
            const multiple_tweets_response = {
                data: [
                    mock_scored_candidate,
                    { ...mock_scored_candidate, tweet_id: 'tweet-2' },
                    { ...mock_scored_candidate, tweet_id: 'tweet-3' },
                ],
                pagination: {
                    next_cursor: 'next-cursor-456',
                    has_more: true,
                },
            };
            foryou_service.getForyouTimeline.mockResolvedValue(multiple_tweets_response);

            const result = await controller.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result.data.length).toBe(3);
            expect(result.data[0].tweet_id).toBe('tweet-1');
            expect(result.data[1].tweet_id).toBe('tweet-2');
            expect(result.data[2].tweet_id).toBe('tweet-3');
        });

        it('should propagate errors from foryou service', async () => {
            const error = new Error('Service error');
            foryou_service.getForyouTimeline.mockRejectedValue(error);

            await expect(
                controller.getForyouTimeline(mock_user_id, mock_pagination)
            ).rejects.toThrow('Service error');
        });

        it('should handle pagination with has_more false', async () => {
            const response_with_no_more = {
                data: [mock_scored_candidate],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            foryou_service.getForyouTimeline.mockResolvedValue(response_with_no_more);

            const result = await controller.getForyouTimeline(mock_user_id, mock_pagination);

            expect(result.pagination.next_cursor).toBeNull();
            expect(result.pagination.has_more).toBe(false);
        });
    });

    describe('getFollowingTimeline', () => {
        it('should call timeline service with correct parameters', async () => {
            await controller.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(timeline_service.getFollowingTimeline).toHaveBeenCalledWith(
                mock_user_id,
                mock_pagination
            );
            expect(timeline_service.getFollowingTimeline).toHaveBeenCalledTimes(1);
        });

        it('should return timeline response from timeline service', async () => {
            const result = await controller.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result).toEqual(mock_timeline_response);
            expect(result.data).toEqual(mock_timeline_response.data);
            expect(result.pagination).toEqual(mock_timeline_response.pagination);
        });

        it('should pass entire pagination object', async () => {
            const custom_pagination: TimelinePaginationDto = {
                cursor: 'custom-cursor',
                limit: 50,
                since_id: 'since-123',
            };

            await controller.getFollowingTimeline(mock_user_id, custom_pagination);

            expect(timeline_service.getFollowingTimeline).toHaveBeenCalledWith(
                mock_user_id,
                custom_pagination
            );
        });

        it('should pass user_id from decorator', async () => {
            await controller.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(timeline_service.getFollowingTimeline).toHaveBeenCalledWith(
                mock_user_id,
                expect.any(Object)
            );
        });

        it('should return empty data when no following tweets available', async () => {
            const empty_response = {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            timeline_service.getFollowingTimeline.mockResolvedValue(empty_response);

            const result = await controller.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result.data).toEqual([]);
            expect(result.pagination.has_more).toBe(false);
        });

        it('should handle multiple tweets in response', async () => {
            const multiple_tweets_response = {
                data: [
                    mock_scored_candidate,
                    { ...mock_scored_candidate, tweet_id: 'tweet-2' },
                    { ...mock_scored_candidate, tweet_id: 'tweet-3' },
                ],
                pagination: {
                    next_cursor: 'next-cursor-789',
                    has_more: true,
                },
            };
            timeline_service.getFollowingTimeline.mockResolvedValue(multiple_tweets_response);

            const result = await controller.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result.data.length).toBe(3);
            expect(result.data[0].tweet_id).toBe('tweet-1');
            expect(result.data[1].tweet_id).toBe('tweet-2');
            expect(result.data[2].tweet_id).toBe('tweet-3');
        });

        it('should handle minimal pagination object', async () => {
            const minimal_pagination: TimelinePaginationDto = {
                cursor: undefined,
                limit: undefined,
                since_id: undefined,
            };

            await controller.getFollowingTimeline(mock_user_id, minimal_pagination);

            expect(timeline_service.getFollowingTimeline).toHaveBeenCalledWith(
                mock_user_id,
                minimal_pagination
            );
        });

        it('should handle pagination with has_more true', async () => {
            const response_with_more = {
                data: Array(20).fill(mock_scored_candidate),
                pagination: {
                    next_cursor: 'next-cursor-xyz',
                    has_more: true,
                },
            };
            timeline_service.getFollowingTimeline.mockResolvedValue(response_with_more);

            const result = await controller.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(result.pagination.next_cursor).toBe('next-cursor-xyz');
            expect(result.pagination.has_more).toBe(true);
            expect(result.data.length).toBe(20);
        });

        it('should not modify pagination object', async () => {
            const original_pagination = { ...mock_pagination };

            await controller.getFollowingTimeline(mock_user_id, mock_pagination);

            expect(mock_pagination).toEqual(original_pagination);
        });
    });
});
