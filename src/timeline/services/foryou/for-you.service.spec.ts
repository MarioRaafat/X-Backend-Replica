import { Test, TestingModule } from '@nestjs/testing';
import { InterestsCandidateSource } from './canditate-sources/interests-source';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
import { ForyouService } from './for-you.service';

describe('ForyouService', () => {
    let service: ForyouService;
    let interest_source: jest.Mocked<InterestsCandidateSource>;

    const mock_user_id = 'user-123';
    const mock_cursor = 'cursor-abc';
    const mock_limit = 20;

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

    const mock_interest_source_response = {
        data: [mock_scored_candidate],
        pagination: {
            next_cursor: 'next-cursor-123',
            has_more: true,
        },
    };

    beforeEach(async () => {
        const mock_interest_source_provider = {
            provide: InterestsCandidateSource,
            useValue: {
                getCandidates: jest.fn().mockResolvedValue(mock_interest_source_response),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [ForyouService, mock_interest_source_provider],
        }).compile();

        service = module.get<ForyouService>(ForyouService);
        interest_source = module.get(InterestsCandidateSource);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getForyouTimeline', () => {
        it('should call interest source with correct parameters', async () => {
            await service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit);

            expect(interest_source.getCandidates).toHaveBeenCalledWith(
                mock_user_id,
                mock_cursor,
                mock_limit
            );
            expect(interest_source.getCandidates).toHaveBeenCalledTimes(1);
        });

        it('should return data from interest source', async () => {
            const result = await service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit);

            expect(result).toEqual(mock_interest_source_response);
            expect(result.data).toEqual(mock_interest_source_response.data);
            expect(result.data.length).toBe(1);
            expect(result.data[0]).toEqual(mock_scored_candidate);
        });

        it('should return correct pagination from interest source', async () => {
            const result = await service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit);

            expect(result.pagination).toEqual(mock_interest_source_response.pagination);
            expect(result.pagination.next_cursor).toBe('next-cursor-123');
            expect(result.pagination.has_more).toBe(true);
        });

        it('should use default limit of 20 when not provided', async () => {
            await service.getForyouTimeline(mock_user_id, mock_cursor);

            expect(interest_source.getCandidates).toHaveBeenCalledWith(
                mock_user_id,
                mock_cursor,
                20
            );
        });

        it('should work without cursor parameter', async () => {
            await service.getForyouTimeline(mock_user_id);

            expect(interest_source.getCandidates).toHaveBeenCalledWith(mock_user_id, undefined, 20);
        });

        it('should work with only user_id parameter', async () => {
            const result = await service.getForyouTimeline(mock_user_id);

            expect(result).toEqual(mock_interest_source_response);
            expect(interest_source.getCandidates).toHaveBeenCalledWith(mock_user_id, undefined, 20);
        });

        it('should handle empty data from interest source', async () => {
            const empty_response = {
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            interest_source.getCandidates.mockResolvedValue(empty_response);

            const result = await service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit);

            expect(result.data).toEqual([]);
            expect(result.pagination.next_cursor).toBeNull();
            expect(result.pagination.has_more).toBe(false);
        });

        it('should handle multiple scored candidates', async () => {
            const multiple_candidates = {
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
            interest_source.getCandidates.mockResolvedValue(multiple_candidates);

            const result = await service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit);

            expect(result.data.length).toBe(3);
            expect(result.data[0].tweet_id).toBe('tweet-1');
            expect(result.data[1].tweet_id).toBe('tweet-2');
            expect(result.data[2].tweet_id).toBe('tweet-3');
        });

        it('should handle custom limit values', async () => {
            const custom_limit = 50;
            await service.getForyouTimeline(mock_user_id, mock_cursor, custom_limit);

            expect(interest_source.getCandidates).toHaveBeenCalledWith(
                mock_user_id,
                mock_cursor,
                custom_limit
            );
        });

        it('should propagate errors from interest source', async () => {
            const error = new Error('Database connection failed');
            interest_source.getCandidates.mockRejectedValue(error);

            await expect(
                service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit)
            ).rejects.toThrow('Database connection failed');
        });

        it('should handle null cursor correctly', async () => {
            await service.getForyouTimeline(mock_user_id, null as any);

            expect(interest_source.getCandidates).toHaveBeenCalledWith(mock_user_id, null, 20);
        });

        it('should preserve pagination has_more flag when false', async () => {
            const response_with_no_more = {
                data: [mock_scored_candidate],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            };
            interest_source.getCandidates.mockResolvedValue(response_with_no_more);

            const result = await service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit);

            expect(result.pagination.has_more).toBe(false);
        });

        it('should return the exact structure from interest source', async () => {
            const result = await service.getForyouTimeline(mock_user_id, mock_cursor, mock_limit);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(result.pagination).toHaveProperty('next_cursor');
            expect(result.pagination).toHaveProperty('has_more');
            expect(Array.isArray(result.data)).toBe(true);
        });
    });
});
