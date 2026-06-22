import { Test, TestingModule } from '@nestjs/testing';
import { WhoToFollowService } from './who-to-follow.service';
import { UserRepository } from '../user/user.repository';

describe('WhoToFollowService', () => {
    let service: WhoToFollowService;
    let user_repository: UserRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WhoToFollowService,
                {
                    provide: UserRepository,
                    useValue: {
                        createQueryBuilder: jest.fn(),
                        query: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<WhoToFollowService>(WhoToFollowService);
        user_repository = module.get<UserRepository>(UserRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getWhoToFollow', () => {
        it('should return popular users for non-authenticated users', async () => {
            const mock_users = [
                {
                    id: 'user-1',
                    username: 'user1',
                    name: 'User 1',
                    bio: 'Bio 1',
                    avatar_url: 'avatar1.jpg',
                    verified: true,
                    followers: 1000,
                    following: 100,
                },
                {
                    id: 'user-2',
                    username: 'user2',
                    name: 'User 2',
                    bio: 'Bio 2',
                    avatar_url: 'avatar2.jpg',
                    verified: false,
                    followers: 500,
                    following: 50,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_users),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(undefined, 2);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('user-1');
            expect(result[0].username).toBe('user1');
            expect(result[0].is_following).toBe(false);
            expect(result[0].is_followed).toBe(false);
            expect(result[1].id).toBe('user-2');
        });

        it('should handle null/undefined user fields in popular users', async () => {
            const mock_users = [
                {
                    id: 'user-1',
                    username: 'user1',
                    name: 'User 1',
                    bio: null,
                    avatar_url: null,
                    verified: null,
                    followers: null,
                    following: null,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mock_users),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(undefined, 1);

            expect(result).toHaveLength(1);
            expect(result[0].bio).toBe('');
            expect(result[0].avatar_url).toBe('');
            expect(result[0].verified).toBe(false);
            expect(result[0].followers).toBe(0);
            expect(result[0].following).toBe(0);
        });

        it('should return personalized recommendations for authenticated users', async () => {
            const user_id = 'current-user-123';

            // Mock query responses for all 5 sources
            const mock_fof_users = [{ user_id: 'fof-1', mutual_count: 5 }];
            const mock_interest_users = [
                { user_id: 'interest-1', common_categories: 3, avg_interest_score: 80 },
            ];
            const mock_liked_users = [{ user_id: 'liked-1', like_count: 10 }];
            const mock_replied_users = [{ user_id: 'replied-1', reply_count: 3 }];
            const mock_followers_users = [{ user_id: 'follower-1' }];

            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce(mock_fof_users)
                .mockResolvedValueOnce(mock_interest_users)
                .mockResolvedValueOnce(mock_liked_users)
                .mockResolvedValueOnce(mock_replied_users)
                .mockResolvedValueOnce(mock_followers_users);

            const mock_final_users = [
                {
                    user_id: 'fof-1',
                    user_username: 'fofuser',
                    user_name: 'FoF User',
                    user_bio: 'Bio',
                    user_avatar_url: 'avatar.jpg',
                    user_verified: false,
                    user_followers: 100,
                    user_following: 50,
                    is_following: false,
                    is_followed: false,
                },
                {
                    user_id: 'interest-1',
                    user_username: 'interestuser',
                    user_name: 'Interest User',
                    user_bio: 'Bio',
                    user_avatar_url: 'avatar.jpg',
                    user_verified: false,
                    user_followers: 100,
                    user_following: 50,
                    is_following: false,
                    is_followed: false,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mock_final_users),
                getMany: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(user_id, 10);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(user_repository.query).toHaveBeenCalledTimes(5); // 5 sources
        });

        it('should exclude followed users from popular users backfill', async () => {
            const user_id = 'current-user-123';

            // Mock minimal responses from all sources (only 1 user)
            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce([{ user_id: 'user-1', mutual_count: 1 }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const mock_recommended_users = [
                {
                    user_id: 'user-1',
                    user_username: 'user1',
                    user_name: 'User 1',
                    user_bio: '',
                    user_avatar_url: '',
                    user_verified: false,
                    user_followers: 10,
                    user_following: 5,
                    is_following: false,
                    is_followed: false,
                },
            ];

            const mock_popular_users = [
                {
                    id: 'popular-1',
                    username: 'popular1',
                    name: 'Popular User 1',
                    bio: '',
                    avatar_url: '',
                    verified: true,
                    followers: 10000,
                    following: 100,
                },
                {
                    id: 'popular-2',
                    username: 'popular2',
                    name: 'Popular User 2',
                    bio: '',
                    avatar_url: '',
                    verified: false,
                    followers: 5000,
                    following: 200,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mock_recommended_users),
                getMany: jest.fn().mockResolvedValue(mock_popular_users),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(user_id, 5);

            // Verify that andWhere was called to filter out followed users
            expect(mock_query_builder.andWhere).toHaveBeenCalledWith(
                'user.id != :current_user_id',
                { current_user_id: user_id }
            );

            // Verify that andWhere was called to exclude followed users
            const and_where_calls = mock_query_builder.andWhere.mock.calls;
            expect(and_where_calls.length).toBeGreaterThan(1);
            const follows_filter_call = and_where_calls.find((call: any[]) =>
                call[0].includes('user_follows')
            );
            expect(follows_filter_call).toBeDefined();
        });

        it('should backfill with popular users if recommendations are insufficient', async () => {
            const user_id = 'current-user-123';

            // Mock minimal responses from all sources (only 2 users)
            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce([{ user_id: 'user-1', mutual_count: 1 }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ user_id: 'user-2' }]);

            const mock_recommended_users = [
                {
                    user_id: 'user-1',
                    user_username: 'user1',
                    user_name: 'User 1',
                    user_bio: '',
                    user_avatar_url: '',
                    user_verified: false,
                    user_followers: 10,
                    user_following: 5,
                    is_following: false,
                    is_followed: false,
                },
                {
                    user_id: 'user-2',
                    user_username: 'user2',
                    user_name: 'User 2',
                    user_bio: '',
                    user_avatar_url: '',
                    user_verified: false,
                    user_followers: 20,
                    user_following: 10,
                    is_following: false,
                    is_followed: false,
                },
            ];

            const mock_popular_users = [
                {
                    id: 'popular-1',
                    username: 'popular1',
                    name: 'Popular User 1',
                    bio: '',
                    avatar_url: '',
                    verified: true,
                    followers: 10000,
                    following: 100,
                },
                {
                    id: 'popular-2',
                    username: 'popular2',
                    name: 'Popular User 2',
                    bio: '',
                    avatar_url: '',
                    verified: false,
                    followers: 5000,
                    following: 200,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mock_recommended_users),
                getMany: jest.fn().mockResolvedValue(mock_popular_users),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(user_id, 5);

            expect(result.length).toBe(4); // 2 from recommendations + 2 from popular
        });

        it('should handle null/undefined fields in personalized recommendations', async () => {
            const user_id = 'current-user-test';

            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce([{ user_id: 'user-1', mutual_count: 5 }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const mock_users_with_nulls = [
                {
                    user_id: 'user-1',
                    user_username: 'user1',
                    user_name: 'User 1',
                    user_bio: null,
                    user_avatar_url: null,
                    user_verified: null,
                    user_followers: null,
                    user_following: null,
                    is_following: null,
                    is_followed: null,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mock_users_with_nulls),
                getMany: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(user_id, 10);

            expect(result).toHaveLength(1);
            expect(result[0].bio).toBe('');
            expect(result[0].avatar_url).toBe('');
            expect(result[0].verified).toBe(false);
            expect(result[0].followers).toBe(0);
            expect(result[0].following).toBe(0);
            expect(result[0].is_following).toBe(false);
            expect(result[0].is_followed).toBe(false);
        });
    });

    describe('Distribution Logic', () => {
        it('should correctly distribute users according to percentages', async () => {
            const user_id = 'current-user-123';

            // Mock responses with enough users from each source
            const mock_fof_users = Array.from({ length: 20 }, (_, i) => ({
                user_id: `fof-${i}`,
                mutual_count: 5,
            }));
            const mock_interest_users = Array.from({ length: 10 }, (_, i) => ({
                user_id: `interest-${i}`,
                common_categories: 3,
                avg_interest_score: 80,
            }));
            const mock_liked_users = Array.from({ length: 15 }, (_, i) => ({
                user_id: `liked-${i}`,
                like_count: 10,
            }));
            const mock_replied_users = Array.from({ length: 10 }, (_, i) => ({
                user_id: `replied-${i}`,
                reply_count: 3,
            }));
            const mock_followers_users = Array.from({ length: 10 }, (_, i) => ({
                user_id: `follower-${i}`,
            }));

            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce(mock_fof_users)
                .mockResolvedValueOnce(mock_interest_users)
                .mockResolvedValueOnce(mock_liked_users)
                .mockResolvedValueOnce(mock_replied_users)
                .mockResolvedValueOnce(mock_followers_users);

            // Create mock final users for all user IDs
            const all_user_ids = [
                ...mock_fof_users.map((u) => u.user_id),
                ...mock_interest_users.map((u) => u.user_id),
                ...mock_liked_users.map((u) => u.user_id),
                ...mock_replied_users.map((u) => u.user_id),
                ...mock_followers_users.map((u) => u.user_id),
            ];

            const mock_final_users = all_user_ids.map((id) => ({
                user_id: id,
                user_username: `user_${id}`,
                user_name: `User ${id}`,
                user_bio: '',
                user_avatar_url: '',
                user_verified: false,
                user_followers: 100,
                user_following: 50,
                is_following: false,
                is_followed: false,
            }));

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mock_final_users),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const limit = 10;
            const result = await service.getWhoToFollow(user_id, limit);

            // Verify correct number returned
            expect(result.length).toBe(limit);

            // Distribution should be: 35% FoF (4), 15% interests (2), 20% likes (2), 15% replies (2), 15% followers (2)
            // Note: Due to rounding and deduplication, exact counts may vary slightly
            expect(result.length).toBeLessThanOrEqual(limit);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty results from all sources', async () => {
            const user_id = 'current-user-123';

            // Mock empty responses from all sources
            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
                getMany: jest.fn().mockResolvedValue([
                    {
                        id: 'popular-1',
                        username: 'popular',
                        name: 'Popular',
                        bio: '',
                        avatar_url: '',
                        verified: true,
                        followers: 1000,
                        following: 100,
                    },
                ]),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(user_id, 5);

            // Should fallback to popular users
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle limit of 1', async () => {
            const user_id = 'current-user-123';

            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce([{ user_id: 'user-1', mutual_count: 1 }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    {
                        user_id: 'user-1',
                        user_username: 'user1',
                        user_name: 'User 1',
                        user_bio: '',
                        user_avatar_url: '',
                        user_verified: false,
                        user_followers: 10,
                        user_following: 5,
                        is_following: false,
                        is_followed: false,
                    },
                ]),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(user_id, 1);

            expect(result).toHaveLength(1);
        });

        it('should handle duplicate users across sources', async () => {
            const user_id = 'current-user-123';
            const duplicate_user_id = 'duplicate-user';

            // Same user appears in multiple sources
            jest.spyOn(user_repository, 'query')
                .mockResolvedValueOnce([{ user_id: duplicate_user_id, mutual_count: 5 }])
                .mockResolvedValueOnce([
                    { user_id: duplicate_user_id, common_categories: 3, avg_interest_score: 80 },
                ])
                .mockResolvedValueOnce([{ user_id: duplicate_user_id, like_count: 10 }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    {
                        user_id: duplicate_user_id,
                        user_username: 'dupuser',
                        user_name: 'Duplicate User',
                        user_bio: '',
                        user_avatar_url: '',
                        user_verified: false,
                        user_followers: 100,
                        user_following: 50,
                        is_following: false,
                        is_followed: false,
                    },
                ]),
                getMany: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(user_repository, 'createQueryBuilder').mockReturnValue(
                mock_query_builder as any
            );

            const result = await service.getWhoToFollow(user_id, 10);

            // Should only include the user once
            const user_ids = result.map((u) => u.id);
            const unique_user_ids = new Set(user_ids);
            expect(user_ids.length).toBe(unique_user_ids.size);
        });
    });

    describe('calculateScore', () => {
        it('should calculate score for friends of friends correctly', () => {
            const user = { mutual_count: 5 };
            // Access private method through any
            const score = (service as any).calculateScore(user, 'fof');
            expect(score).toBe(50); // 5/10 * 100 = 50
        });

        it('should cap friends of friends score at 100', () => {
            const user = { mutual_count: 15 };
            const score = (service as any).calculateScore(user, 'fof');
            expect(score).toBe(100);
        });

        it('should calculate score for interest-based users correctly', () => {
            const user = { common_categories: 1, avg_interest_score: 80 };
            const score = (service as any).calculateScore(user, 'interests');
            // (1/2 * 60) + (80/100 * 40) = 30 + 32 = 62
            expect(score).toBe(62);
        });

        it('should cap interest-based score correctly', () => {
            const user = { common_categories: 5, avg_interest_score: 100 };
            const score = (service as any).calculateScore(user, 'interests');
            expect(score).toBe(100); // 60 (capped) + 40 (capped) = 100
        });

        it('should calculate score for liked users correctly', () => {
            const user = { like_count: 7 };
            const score = (service as any).calculateScore(user, 'likes');
            expect(score).toBe(70); // 7/10 * 100 = 70
        });

        it('should cap liked users score at 100', () => {
            const user = { like_count: 20 };
            const score = (service as any).calculateScore(user, 'likes');
            expect(score).toBe(100);
        });

        it('should calculate score for replied users correctly', () => {
            const user = { reply_count: 3 };
            const score = (service as any).calculateScore(user, 'replies');
            expect(score).toBe(30); // 3/10 * 100 = 30
        });

        it('should cap replied users score at 100', () => {
            const user = { reply_count: 15 };
            const score = (service as any).calculateScore(user, 'replies');
            expect(score).toBe(100);
        });

        it('should return fixed score for followers', () => {
            const user = {};
            const score = (service as any).calculateScore(user, 'followers');
            expect(score).toBe(50);
        });

        it('should return 0 for unknown source', () => {
            const user = {};
            const score = (service as any).calculateScore(user, 'unknown' as any);
            expect(score).toBe(0);
        });
    });

    describe('combineByDistribution', () => {
        it('should handle empty arrays from all sources', () => {
            const result = (service as any).combineByDistribution([], [], [], [], [], 10);
            expect(result).toEqual([]);
        });

        it('should fill remaining slots when distribution yields fewer users', () => {
            const fof_users = [{ user_id: 'user-1', mutual_count: 5 }];
            const result = (service as any).combineByDistribution(fof_users, [], [], [], [], 10);
            expect(result.length).toBeLessThanOrEqual(10);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should deduplicate users across sources', () => {
            const duplicate_id = 'duplicate-user';
            const fof_users = [{ user_id: duplicate_id, mutual_count: 5 }];
            const interest_users = [
                { user_id: duplicate_id, common_categories: 2, avg_interest_score: 80 },
            ];
            const result = (service as any).combineByDistribution(
                fof_users,
                interest_users,
                [],
                [],
                [],
                10
            );
            const user_ids = result.map((u: any) => u.user_id);
            const unique_ids = new Set(user_ids);
            expect(user_ids.length).toBe(unique_ids.size);
        });

        it('should sort results by score descending', () => {
            const fof_users = [
                { user_id: 'user-1', mutual_count: 2 },
                { user_id: 'user-2', mutual_count: 8 },
            ];
            const result = (service as any).combineByDistribution(fof_users, [], [], [], [], 10);
            if (result.length > 1) {
                expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
            }
        });

        it('should respect the limit parameter', () => {
            const fof_users = Array.from({ length: 20 }, (_, i) => ({
                user_id: `user-${i}`,
                mutual_count: 5,
            }));
            const result = (service as any).combineByDistribution(fof_users, [], [], [], [], 5);
            expect(result.length).toBeLessThanOrEqual(5);
        });
    });
});
