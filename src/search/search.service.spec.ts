import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { UserRepository } from 'src/user/user.repository';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { DataSource } from 'typeorm';
import { RedisService } from 'src/redis/redis.service';
import { TweetType } from 'src/shared/enums/tweet-types.enum';
import { BasicQueryDto } from './dto/basic-query.dto';

describe('SearchService', () => {
    let service: SearchService;
    let elasticsearch_service: jest.Mocked<ElasticsearchService>;
    let user_repository: jest.Mocked<UserRepository>;
    let data_source: jest.Mocked<DataSource>;
    let redis_service: jest.Mocked<RedisService>;

    beforeEach(async () => {
        const mock_elasticsearch_service = {
            search: jest.fn(),
            mget: jest.fn(),
        };

        const mock_query_builder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            addOrderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            setParameters: jest.fn().mockReturnThis(),
            getRawMany: jest.fn(),
        };

        const mock_user_repository = {
            createQueryBuilder: jest.fn(() => mock_query_builder),
        };

        const mock_data_source = {
            query: jest.fn(),
        };

        const mock_redis_service = {
            zrevrange: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchService,
                { provide: ElasticsearchService, useValue: mock_elasticsearch_service },
                { provide: UserRepository, useValue: mock_user_repository },
                { provide: DataSource, useValue: mock_data_source },
                { provide: RedisService, useValue: mock_redis_service },
            ],
        }).compile();

        service = module.get<SearchService>(SearchService);
        elasticsearch_service = module.get(ElasticsearchService);
        user_repository = module.get(UserRepository);
        data_source = module.get(DataSource);
        redis_service = module.get(RedisService);
    });

    afterEach(() => jest.clearAllMocks());

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getSuggestions', () => {
        it('should return empty result when query is empty', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto = { query: '' };

            const result = await service.getSuggestions(current_user_id, query_dto);

            expect(result).toEqual({
                suggested_queries: [],
                suggested_users: [],
            });
            expect(elasticsearch_service.search).not.toHaveBeenCalled();
        });

        it('should return suggestions with users and queries with normal query', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto = { query: 'tech' };

            const mock_query_builder = user_repository.createQueryBuilder() as any;
            mock_query_builder.getRawMany.mockResolvedValueOnce([
                {
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'alyaa242',
                    name: 'Alyaa Ali',
                    bio: 'Blah',
                    avatar_url: 'https://example.com/avatar.jpg',
                    verified: true,
                    followers: 100,
                    following: 50,
                    is_following: false,
                    is_follower: false,
                },
            ]);

            redis_service.zrevrange.mockResolvedValueOnce([]);

            elasticsearch_service.search.mockResolvedValueOnce({
                hits: {
                    hits: [
                        {
                            _source: { content: 'technology is fun' },
                            highlight: { content: ['<MARK>technology</MARK> is fun'] },
                        },
                    ],
                },
            } as any);

            const result = await service.getSuggestions(current_user_id, query_dto);

            expect(result.suggested_users).toHaveLength(1);
            expect(result.suggested_users[0]).toEqual({
                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                is_following: false,
                is_follower: false,
            });
            expect(result.suggested_queries).toHaveLength(1);
            expect(result.suggested_queries[0]).toEqual({
                query: 'technology is fun',
                is_trending: false,
            });
        });

        it('should handle hashtag queries', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto = { query: '#tech' };

            const mock_query_builder = user_repository.createQueryBuilder() as any;
            mock_query_builder.getRawMany.mockResolvedValueOnce([]);

            redis_service.zrevrange.mockResolvedValueOnce(['#technology', '150']);

            elasticsearch_service.search.mockResolvedValueOnce({
                hits: {
                    hits: [
                        {
                            _source: {
                                content: 'Check out #technology',
                                hashtags: ['#technology'],
                            },
                            highlight: { content: ['Check out #<MARK>tech</MARK>nology'] },
                        },
                    ],
                },
            } as any);

            const result = await service.getSuggestions(current_user_id, query_dto);

            expect(result.suggested_queries).toHaveLength(1);
            expect(result.suggested_queries[0]).toEqual({
                query: '#technology',
                is_trending: true,
            });
        });

        it('should sanitize special characters from query', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto = { query: 'tech!' };

            const mock_query_builder = user_repository.createQueryBuilder() as any;
            mock_query_builder.getRawMany.mockResolvedValueOnce([]);

            redis_service.zrevrange.mockResolvedValueOnce([]);
            elasticsearch_service.search.mockResolvedValueOnce({
                hits: { hits: [] },
            } as any);

            const result = await service.getSuggestions(current_user_id, query_dto);

            expect(result).toEqual({
                suggested_queries: [],
                suggested_users: [],
            });
        });
        it('should fetch and normalize trending hashtags', async () => {
            const mock_redis_result = [
                '#technology',
                '150.5',
                'javascript',
                '120.3',
                '#ai',
                '100.0',
            ];

            redis_service.zrevrange.mockResolvedValueOnce(mock_redis_result);

            const result = await (service as any).getTrendingHashtags();

            expect(result.size).toBe(3);
            expect(result.get('#technology')).toBe(150.5);
            expect(result.get('#javascript')).toBe(120.3);
            expect(result.get('#ai')).toBe(100.0);
        });

        it('should return empty map when redis returns empty result', async () => {
            redis_service.zrevrange.mockResolvedValueOnce([]);

            const result = await (service as any).getTrendingHashtags();

            expect(result.size).toBe(0);
            expect(result instanceof Map).toBe(true);
        });

        it('should return empty map when redis returns null', async () => {
            redis_service.zrevrange.mockResolvedValueOnce(null as any);

            const result = await (service as any).getTrendingHashtags();

            expect(result.size).toBe(0);
            expect(result instanceof Map).toBe(true);
        });

        it('should return empty map when error occurs', async () => {
            redis_service.zrevrange.mockRejectedValueOnce(new Error('Redis connection failed'));

            const console_spy = jest.spyOn(console, 'error').mockImplementation();

            const result = await (service as any).getTrendingHashtags();

            expect(result.size).toBe(0);
            expect(result instanceof Map).toBe(true);
            expect(console_spy).toHaveBeenCalledWith(
                'Error fetching trending hashtags:',
                expect.any(Error)
            );

            console_spy.mockRestore();
        });

        it('should normalize hashtags without # prefix', async () => {
            const mock_redis_result = ['nodejs', '90.0', 'react', '85.5'];

            redis_service.zrevrange.mockResolvedValueOnce(mock_redis_result);

            const result = await (service as any).getTrendingHashtags();

            expect(result.get('#nodejs')).toBe(90.0);
            expect(result.get('#react')).toBe(85.5);
        });

        it('should handle errors in parallel execution', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const query_dto: BasicQueryDto = {
                query: 'test',
            };

            const mock_query_builder = {
                setParameters: jest.fn().mockReturnThis(),
            };

            user_repository.createQueryBuilder.mockReturnValueOnce(mock_query_builder as any);

            jest.spyOn(service as any, 'attachUserSearchQuery').mockReturnValueOnce(
                mock_query_builder
            );
            jest.spyOn(service as any, 'executeUsersSearch').mockRejectedValueOnce(
                new Error('DB error')
            );
            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(new Map());

            elasticsearch_service.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

            await expect(service.getSuggestions(current_user_id, query_dto)).rejects.toThrow();
        });
    });

    describe('searchUsers', () => {
        it('should return empty result when query is empty', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = { query: '', limit: 20 };

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: { next_cursor: null, has_more: false },
            });
            expect(user_repository.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('should search users with no pagination', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = { query: 'alyaa', limit: 20 };

            const mock_query_builder = user_repository.createQueryBuilder() as any;
            mock_query_builder.getRawMany.mockResolvedValueOnce([
                {
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'alyaa242',
                    name: 'Alyaa Ali',
                    bio: 'Software developer',
                    avatar_url: 'https://example.com/avatar.jpg',
                    cover_url: 'https://example.com/avatar.jpg',
                    verified: true,
                    followers: 100,
                    following: 50,
                    is_following: false,
                    is_follower: false,
                    total_score: 150.5,
                },
            ]);

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(user_repository.createQueryBuilder).toHaveBeenCalledWith('user');
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toEqual({
                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                bio: 'Software developer',
                avatar_url: 'https://example.com/avatar.jpg',
                cover_url: 'https://example.com/avatar.jpg',
                verified: true,
                followers: 100,
                following: 50,
                is_following: false,
                is_follower: false,
                is_muted: undefined,
                is_blocked: undefined,
            });
            expect(result.pagination).toEqual({
                next_cursor: null,
                has_more: false,
            });
        });

        it('should search users with pagination', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = { query: 'alyaa', limit: 1 };

            const mock_query_builder = user_repository.createQueryBuilder() as any;
            mock_query_builder.getRawMany.mockResolvedValueOnce([
                {
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'alyaa242',
                    name: 'Alyaa Ali',
                    bio: 'Software developer',
                    avatar_url: 'https://example.com/avatar.jpg',
                    cover_url: 'https://example.com/avatar.jpg',
                    verified: true,
                    followers: 100,
                    following: 50,
                    is_following: false,
                    is_follower: false,
                    total_score: 150.5,
                },
                {
                    user_id: '1a8e2906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'alyaali242',
                    name: 'Alyaa Ali',
                    bio: 'Software developer',
                    avatar_url: 'https://example.com/avatar.jpg',
                    cover_url: 'https://example.com/avatar.jpg',
                    verified: true,
                    followers: 100,
                    following: 50,
                    is_following: false,
                    is_follower: false,
                    total_score: 140.2,
                },
            ]);

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(user_repository.createQueryBuilder).toHaveBeenCalledWith('user');
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toEqual({
                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                bio: 'Software developer',
                avatar_url: 'https://example.com/avatar.jpg',
                cover_url: 'https://example.com/avatar.jpg',
                verified: true,
                followers: 100,
                following: 50,
                is_following: false,
                is_follower: false,
                is_muted: undefined,
                is_blocked: undefined,
            });
            expect(result.pagination).toEqual({
                next_cursor: Buffer.from(
                    JSON.stringify({
                        score: 150.5,
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    })
                ).toString('base64'),
                has_more: true,
            });
        });

        it('should throw error for invalid cursor', async () => {
            const query_dto: SearchQueryDto = {
                query: 'alyaa',
                limit: 20,
                cursor: 'invalid-cursor',
            };

            await expect(service.searchUsers('user-id', query_dto)).rejects.toThrow(
                'Invalid cursor'
            );
        });

        describe('username filter', () => {
            it('should apply username filter when username is provided', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    username: 'john_doe',
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: false,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.andWhere).toHaveBeenCalled();
                expect(mock_query_builder.setParameters).toHaveBeenCalledWith(
                    expect.objectContaining({
                        username: 'john_doe',
                    })
                );
                expect(result.data).toHaveLength(1);
            });

            it('should not apply username filter when username is not provided', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: false,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.setParameters).toHaveBeenCalledWith(
                    expect.objectContaining({
                        username: undefined,
                    })
                );
                expect(result.data).toHaveLength(1);
            });

            it('should filter users who follow or are followed by target username', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    username: 'target_user',
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: true,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(result.data).toHaveLength(1);
                expect(result.data[0].username).toBe('alyaa242');
            });

            it('should return empty results when no users match username filter', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    username: 'nonexistent_user',
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(result.data).toHaveLength(0);
                expect(result.pagination.has_more).toBe(false);
                expect(result.pagination.next_cursor).toBeNull();
            });
        });

        describe('cursor pagination', () => {
            it('should apply cursor pagination with valid cursor', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const cursor = Buffer.from(
                    JSON.stringify({
                        score: 150.5,
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    })
                ).toString('base64');

                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor,
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'alyaa_next',
                        name: 'Alyaa Next',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 90,
                        following: 40,
                        is_following: false,
                        is_follower: false,
                        total_score: 140.0,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.andWhere).toHaveBeenCalled();
                expect(result.data).toHaveLength(1);
                expect(result.data[0].username).toBe('alyaa_next');
            });

            it('should handle cursor with score less than condition', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const cursor = Buffer.from(
                    JSON.stringify({
                        score: 200.0,
                        user_id: 'first-user-id',
                    })
                ).toString('base64');

                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor,
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '3c0g1128-87dd-6gc6-c836-gee8c556gg16',
                        username: 'lower_score_user',
                        name: 'Lower Score',
                        bio: 'Developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: false,
                        followers: 50,
                        following: 30,
                        is_following: false,
                        is_follower: false,
                        is_blocked: false,
                        is_muted: false,
                        total_score: 150.0,
                    },
                ]);

                const user = {
                    user_id: '3c0g1128-87dd-6gc6-c836-gee8c556gg16',
                    username: 'lower_score_user',
                    name: 'Lower Score',
                    bio: 'Developer',
                    avatar_url: 'https://example.com/avatar.jpg',
                    cover_url: 'https://example.com/avatar.jpg',
                    verified: false,
                    followers: 50,
                    following: 30,
                    is_following: false,
                    is_follower: false,
                    is_blocked: false,
                    is_muted: false,
                };

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(result.data).toHaveLength(1);
                expect(result.data[0]).toEqual(user);
            });

            it('should handle cursor with equal score and greater ID condition', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const cursor = Buffer.from(
                    JSON.stringify({
                        score: 150.5,
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    })
                ).toString('base64');

                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor,
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee95',
                        username: 'same_score_user',
                        name: 'Same Score User',
                        bio: 'Developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: false,
                        followers: 100,
                        following: 50,
                        is_following: false,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(result.data).toHaveLength(1);
            });

            it('should throw error when cursor is malformed JSON', async () => {
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor: Buffer.from('not-valid-json').toString('base64'),
                };

                await expect(service.searchUsers('user-id', query_dto)).rejects.toThrow(
                    'Invalid cursor'
                );
            });

            it('should throw error when cursor is not base64', async () => {
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor: 'not-base64-string!!!',
                };

                await expect(service.searchUsers('user-id', query_dto)).rejects.toThrow(
                    'Invalid cursor'
                );
            });

            it('should throw error when cursor has missing fields', async () => {
                const cursor = Buffer.from(
                    JSON.stringify({
                        score: 150.5,
                    })
                ).toString('base64');

                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor,
                };

                await expect(service.searchUsers('user-id', query_dto)).rejects.toThrow();
            });

            it('should not apply cursor pagination when cursor is null', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor: null,
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;

                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: false,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(result.data).toHaveLength(1);
            });

            it('should set limit to 20 when not passed', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    cursor: null,
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;

                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: false,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.limit).toHaveBeenCalledWith(21);
            });
        });

        describe('attachUserSearchQuery coverage', () => {
            it('should add is_following and is_follower joins', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = { query: 'alyaa', limit: 20 };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: true,
                        is_follower: true,
                        total_score: 1000150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.leftJoin).toHaveBeenCalled();
                expect(mock_query_builder.addSelect).toHaveBeenCalled();
                expect(result.data[0].is_following).toBe(true);
                expect(result.data[0].is_follower).toBe(true);
            });

            it('should exclude blocked users', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = { query: 'alyaa', limit: 20 };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: false,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.andWhere).toHaveBeenCalledWith(
                    expect.stringContaining('user_blocks')
                );
            });

            it('should apply search_vector query with prefix', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = { query: 'alyaa', limit: 20 };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([]);

                await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.where).toHaveBeenCalled();
                expect(mock_query_builder.setParameters).toHaveBeenCalledWith(
                    expect.objectContaining({
                        prefix_query: expect.any(String),
                    })
                );
            });

            it('should calculate total_score with boost for followed users', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = { query: 'alyaa', limit: 20 };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'followed_user',
                        name: 'Followed User',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: true,
                        is_follower: false,
                        total_score: 1000150.5,
                    },
                ]);

                const user = {
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'followed_user',
                    name: 'Followed User',
                    bio: 'Software developer',
                    avatar_url: 'https://example.com/avatar.jpg',
                    cover_url: 'https://example.com/avatar.jpg',
                    verified: true,
                    followers: 100,
                    following: 50,
                    is_following: true,
                    is_follower: false,
                };

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(result.data[0]).toEqual(user);
            });

            it('should include all user fields in select', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = { query: 'alyaa', limit: 20 };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        bio: 'Software developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/cover.jpg',
                        verified: true,
                        followers: 100,
                        following: 50,
                        is_following: false,
                        is_follower: false,
                        total_score: 150.5,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.select).toHaveBeenCalled();
                expect(result.data[0]).toHaveProperty('user_id');
                expect(result.data[0]).toHaveProperty('username');
                expect(result.data[0]).toHaveProperty('name');
                expect(result.data[0]).toHaveProperty('bio');
                expect(result.data[0]).toHaveProperty('avatar_url');
                expect(result.data[0]).toHaveProperty('cover_url');
                expect(result.data[0]).toHaveProperty('verified');
                expect(result.data[0]).toHaveProperty('followers');
                expect(result.data[0]).toHaveProperty('following');
            });
        });

        describe('combined filters', () => {
            it('should apply both username filter and cursor pagination', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const cursor = Buffer.from(
                    JSON.stringify({
                        score: 150.5,
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    })
                ).toString('base64');

                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 20,
                    cursor,
                    username: 'target_user',
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'filtered_user',
                        name: 'Filtered User',
                        bio: 'Developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: false,
                        followers: 80,
                        following: 40,
                        is_following: true,
                        is_follower: false,
                        is_blocked: false,
                        is_muted: false,
                        total_score: 140.0,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(mock_query_builder.andWhere).toHaveBeenCalledTimes(3);
                expect(mock_query_builder.setParameters).toHaveBeenCalledWith(
                    expect.objectContaining({
                        username: 'target_user',
                    })
                );
                expect(result.data).toHaveLength(1);
            });

            it('should handle username filter with pagination and multiple results', async () => {
                const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
                const query_dto: SearchQueryDto = {
                    query: 'alyaa',
                    limit: 1,
                    username: 'target_user',
                };

                const mock_query_builder = user_repository.createQueryBuilder() as any;
                mock_query_builder.getRawMany.mockResolvedValueOnce([
                    {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'user1',
                        name: 'User One',
                        bio: 'Developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: false,
                        followers: 100,
                        following: 50,
                        is_following: true,
                        is_follower: false,
                        total_score: 160.0,
                    },
                    {
                        user_id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'user2',
                        name: 'User Two',
                        bio: 'Developer',
                        avatar_url: 'https://example.com/avatar.jpg',
                        cover_url: 'https://example.com/avatar.jpg',
                        verified: false,
                        followers: 80,
                        following: 40,
                        is_following: false,
                        is_follower: true,
                        total_score: 150.0,
                    },
                ]);

                const result = await service.searchUsers(current_user_id, query_dto);

                expect(result.data).toHaveLength(1);
                expect(result.pagination.has_more).toBe(true);
                expect(result.pagination.next_cursor).toBeTruthy();
            });
        });
    });
    describe('searchPosts', () => {
        it('should return empty result when query is empty', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '',
                limit: 20,
            };

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            });
            expect(elasticsearch_service.search).not.toHaveBeenCalled();
        });

        it('should search posts with media filter', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
                has_media: true,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'This is a post with images',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                images: ['https://example.com/image1.jpg'],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    should: expect.arrayContaining([
                                        expect.objectContaining({
                                            multi_match: expect.objectContaining({
                                                query: 'technology',
                                            }),
                                        }),
                                    ]),
                                    filter: expect.arrayContaining([
                                        {
                                            script: {
                                                script: {
                                                    source: "(doc['images'].size() > 0 || doc['videos'].size() > 0)",
                                                },
                                            },
                                        },
                                    ]),
                                }),
                            }),
                            functions: expect.arrayContaining([
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_likes',
                                    }),
                                }),
                            ]),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
        });

        it('should search posts with username filter', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
                username: 'alyaa242',
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'This is a post with images',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                images: ['https://example.com/image1.jpg'],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    type: 'tweet',
                    content: 'This is a post with images',
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z',
                    num_likes: 10,
                    num_reposts: 5,
                    num_views: 100,
                    num_replies: 3,
                    num_quotes: 2,
                    images: ['https://example.com/image1.jpg'],
                    videos: [],
                    user: {
                        id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        avatar_url: 'https://example.com/avatar.jpg',
                        followers: 100,
                        following: 50,
                        is_follower: false,
                        is_following: false,
                    },
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    should: expect.arrayContaining([
                                        expect.objectContaining({
                                            multi_match: expect.objectContaining({
                                                query: 'technology',
                                            }),
                                        }),
                                    ]),
                                    filter: expect.arrayContaining([
                                        {
                                            term: {
                                                username: 'alyaa242',
                                            },
                                        },
                                    ]),
                                }),
                            }),
                            functions: expect.arrayContaining([
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_likes',
                                    }),
                                }),
                            ]),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].user.username).toBe('alyaa242');
        });

        it('should search posts with hashtag query and apply trending hashtag boost', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Post with #technology',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: ['#technology'],
                images: ['https://example.com/image1.jpg'],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            const trending_hashtags = new Map([
                ['#technology', 150],
                ['#ai', 100],
            ]);

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(
                trending_hashtags
            );
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    must: expect.arrayContaining([
                                        {
                                            term: {
                                                hashtags: {
                                                    value: '#technology',
                                                    boost: 10,
                                                },
                                            },
                                        },
                                    ]),
                                }),
                            }),
                            functions: expect.arrayContaining([
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_likes',
                                    }),
                                }),
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_reposts',
                                    }),
                                }),
                                expect.objectContaining({
                                    filter: expect.objectContaining({
                                        term: {
                                            hashtags: { value: '#technology' },
                                        },
                                    }),
                                    weight: expect.any(Number),
                                }),
                            ]),
                            boost_mode: 'sum',
                            score_mode: 'sum',
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].content).toContain('#technology');
        });

        it('should search posts with both hashtag and text query with trending boost', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology AI innovation',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Post about AI innovation with #technology',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 15,
                num_reposts: 8,
                num_views: 200,
                num_replies: 5,
                num_quotes: 3,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: ['#technology'],
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                3.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            const trending_hashtags = new Map([
                ['#technology', 200],
                ['#ai', 150],
            ]);

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(
                trending_hashtags
            );
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    must: expect.arrayContaining([
                                        {
                                            term: {
                                                hashtags: {
                                                    value: '#technology',
                                                    boost: 10,
                                                },
                                            },
                                        },
                                    ]),
                                    should: expect.arrayContaining([
                                        expect.objectContaining({
                                            multi_match: expect.objectContaining({
                                                query: expect.stringContaining('AI'),
                                                fields: expect.arrayContaining([
                                                    'content^3',
                                                    'username^2',
                                                    'name',
                                                ]),
                                            }),
                                        }),
                                    ]),
                                    minimum_should_match: 1,
                                }),
                            }),
                            functions: expect.any(Array),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
        });

        it('should apply boosting with empty trending hashtags map', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Post about technology',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: [],
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(new Map());
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            functions: expect.arrayContaining([
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_likes',
                                    }),
                                }),
                            ]),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
        });

        it('should search with multiple hashtags', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology #ai #innovation',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Post with multiple hashtags #technology #ai #innovation',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 20,
                num_reposts: 10,
                num_views: 300,
                num_replies: 8,
                num_quotes: 5,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: ['#technology', '#ai', '#innovation'],
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                5.0,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            const trending_hashtags = new Map([
                ['#technology', 200],
                ['#ai', 250],
                ['#innovation', 180],
            ]);

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(
                trending_hashtags
            );
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].content).toContain('#technology');
            expect(result.data[0].content).toContain('#ai');
            expect(result.data[0].content).toContain('#innovation');
        });

        it('should search posts with multiple filters (media + username)', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
                has_media: true,
                username: 'alyaa242',
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Tech post with media',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                images: ['https://example.com/image1.jpg'],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    filter: expect.arrayContaining([
                                        {
                                            script: {
                                                script: {
                                                    source: "(doc['images'].size() > 0 || doc['videos'].size() > 0)",
                                                },
                                            },
                                        },
                                        {
                                            term: {
                                                username: 'alyaa242',
                                            },
                                        },
                                    ]),
                                }),
                            }),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].images).toBeDefined();
            expect(result.data[0].images.length).toBeGreaterThan(0);
        });

        it('should search posts with pagination and return next_cursor', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 1,
            };

            const mock_tweets = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    type: 'tweet',
                    content: 'This is a post with images',
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z',
                    num_likes: 10,
                    num_reposts: 5,
                    num_views: 100,
                    num_replies: 3,
                    num_quotes: 2,
                    author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'alyaa242',
                    name: 'Alyaa Ali',
                    avatar_url: 'https://example.com/avatar.jpg',
                    followers: 100,
                    following: 50,
                    hashtags: ['#technology'],
                    images: ['https://example.com/image1.jpg'],
                    videos: [],
                },
                {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    type: 'tweet',
                    content: 'Second post about technology',
                    created_at: '2024-01-15T09:30:00Z',
                    updated_at: '2024-01-15T09:30:00Z',
                    num_likes: 5,
                    num_reposts: 2,
                    num_views: 50,
                    num_replies: 1,
                    num_quotes: 0,
                    author_id: '2b9f0017-76cc-5gb5-b725-fdd7b545ff05',
                    username: 'alyaali242',
                    name: 'Alyaa Eissa',
                    avatar_url: 'https://example.com/avatar2.jpg',
                    followers: 50,
                    following: 30,
                    images: [],
                    videos: [],
                },
            ];

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweets[0],
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                        {
                            _source: mock_tweets[1],
                            sort: [
                                2.3,
                                '2024-01-15T09:30:00Z',
                                'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                            ],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce(mock_tweets);

            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweets[0],
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].tweet_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            expect(result.pagination.has_more).toBe(true);
            expect(result.pagination.next_cursor).toBe(
                Buffer.from(
                    JSON.stringify([
                        2.5,
                        '2024-01-15T10:30:00Z',
                        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    ])
                ).toString('base64')
            );
        });

        it('should search posts with cursor for pagination', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const cursor = Buffer.from(
                JSON.stringify([
                    2.5,
                    '2024-01-15T10:30:00Z',
                    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                ])
            ).toString('base64');

            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
                cursor,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'This is a post with images',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: ['#technology'],
                images: ['https://example.com/image1.jpg'],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.3,
                                '2024-01-15T09:30:00Z',
                                'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                            ],
                        },
                    ],
                },
            };
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);

            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    search_after: [
                        2.5,
                        '2024-01-15T10:30:00Z',
                        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    ],
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].tweet_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            expect(result.pagination.has_more).toBe(false);
        });

        it('should return null when encoding undefined cursor', () => {
            const encoded = (service as any).encodeTweetsCursor(undefined);

            expect(encoded).toBeNull();
        });

        it('should return null when encoding null cursor', () => {
            const encoded = (service as any).encodeTweetsCursor(null);

            expect(encoded).toBeNull();
        });

        it('should decode cursor successfully', () => {
            const sort = [2.5, '2024-01-15T10:30:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'];
            const encoded = Buffer.from(JSON.stringify(sort)).toString('base64');
            const decoded = (service as any).decodeTweetsCursor(encoded);

            expect(decoded).toEqual(sort);
        });

        it('should return null when decoding null cursor', () => {
            const decoded = (service as any).decodeTweetsCursor(null);

            expect(decoded).toBeNull();
        });

        it('should return null when decoding invalid cursor', () => {
            const decoded = (service as any).decodeTweetsCursor('invalid-base64-string!!!');

            expect(decoded).toBeNull();
        });

        it('should return null when decoding malformed base64 cursor', () => {
            const decoded = (service as any).decodeTweetsCursor('YWJjZGVmZ2g=');

            expect(decoded).toBeNull();
        });

        it('should search posts and attach parent tweet for reply', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'reply',
                limit: 20,
            };

            const mock_parent_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'post',
                content: 'Original post',
                created_at: '2024-01-15T09:00:00Z',
                updated_at: '2024-01-15T09:00:00Z',
                num_likes: 20,
                num_reposts: 10,
                num_views: 200,
                num_replies: 5,
                num_quotes: 3,
                author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'Alyaali',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/parent-avatar.jpg',
                followers: 100,
                following: 50,
                images: [],
                videos: [],
            };

            const mock_conversation_tweet = {
                tweet_id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'post',
                content: 'Conversation starter',
                created_at: '2024-01-15T08:00:00Z',
                updated_at: '2024-01-15T08:00:00Z',
                num_likes: 30,
                num_reposts: 15,
                num_views: 300,
                num_replies: 10,
                num_quotes: 5,
                author_id: 'conversation-author-id',
                username: 'Alyaali',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/conversation-avatar.jpg',
                followers: 150,
                following: 75,
                images: [],
                videos: [],
            };

            const mock_tweet = {
                tweet_id: '0c059811-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'reply',
                content: 'This is a reply',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                parent_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                conversation_id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                num_likes: 5,
                num_reposts: 2,
                num_views: 50,
                num_replies: 1,
                num_quotes: 0,
                author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'replyuser',
                name: 'Reply User',
                avatar_url: 'https://example.com/reply-avatar.jpg',
                followers: 50,
                following: 25,
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                '0c059811-f706-4c8f-97d7-ba2e9fc22d6d',
                            ],
                        },
                    ],
                },
            };

            const mock_mget_response = {
                docs: [
                    {
                        _id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: mock_parent_tweet,
                    },
                    {
                        _id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: mock_conversation_tweet,
                    },
                ],
            };

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(new Map());
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce(mock_mget_response as any);

            jest.spyOn(service as any, 'attachUserInteractions').mockImplementation((tweets: any) =>
                Promise.resolve(
                    tweets.map((tweet) => ({
                        ...tweet,
                        is_liked: false,
                        is_reposted: false,
                        is_bookmarked: false,
                    }))
                )
            );

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.mget).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    ids: [
                        '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                    ],
                },
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].tweet_id).toBe('0c059811-f706-4c8f-97d7-ba2e9fc22d6d');
            expect(result.data[0].parent_tweet).toBeDefined();
            expect(result.data[0].parent_tweet?.tweet_id).toBe(
                '0c059899-f706-4c8f-97d7-ba2e9fc22d6d'
            );
            expect(result.data[0].conversation_tweet).toBeDefined();
            expect(result.data[0].conversation_tweet?.tweet_id).toBe(
                '0c059822-f706-4c8f-97d7-ba2e9fc22d6d'
            );
        });

        it('should search posts and attach parent tweet for quote', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'quote',
                limit: 20,
            };

            const mock_parent_tweet = {
                tweet_id: 'parent-quote-id',
                type: 'post',
                content: 'Original quoted post',
                created_at: '2024-01-15T09:00:00Z',
                updated_at: '2024-01-15T09:00:00Z',
                num_likes: 25,
                num_reposts: 12,
                num_views: 250,
                num_replies: 6,
                num_quotes: 4,
                author_id: 'parent-author-id',
                username: 'originaluser',
                name: 'Original User',
                avatar_url: 'https://example.com/original-avatar.jpg',
                followers: 120,
                following: 60,
                images: [],
                videos: [],
            };

            const mock_tweet = {
                tweet_id: 'quote-tweet-id',
                type: 'quote',
                content: 'Quoting this great post',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                parent_id: 'parent-quote-id',
                num_likes: 8,
                num_reposts: 4,
                num_views: 80,
                num_replies: 2,
                num_quotes: 1,
                author_id: 'quote-author-id',
                username: 'quoteuser',
                name: 'Quote User',
                avatar_url: 'https://example.com/quote-avatar.jpg',
                followers: 75,
                following: 35,
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [2.8, '2024-01-15T10:30:00Z', 'quote-tweet-id'],
                        },
                    ],
                },
            };

            const mock_mget_response = {
                docs: [
                    {
                        _id: 'parent-quote-id',
                        found: true,
                        _source: mock_parent_tweet,
                    },
                ],
            };

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(new Map());
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce(mock_mget_response as any);

            jest.spyOn(service as any, 'attachUserInteractions').mockImplementation((tweets: any) =>
                Promise.resolve(
                    tweets.map((tweet) => ({
                        ...tweet,
                        is_liked: false,
                        is_reposted: false,
                        is_bookmarked: false,
                    }))
                )
            );

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.mget).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    ids: ['parent-quote-id'],
                },
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].type).toBe('quote');
            expect(result.data[0].parent_tweet).toBeDefined();
            expect(result.data[0].parent_tweet?.tweet_id).toBe('parent-quote-id');
        });

        it('should handle posts without related tweets (regular posts)', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'regular post',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'regular-post-id',
                type: 'post',
                content: 'Just a regular post',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 15,
                num_reposts: 7,
                num_views: 150,
                num_replies: 4,
                num_quotes: 2,
                author_id: 'regular-author-id',
                username: 'regularuser',
                name: 'Regular User',
                avatar_url: 'https://example.com/regular-avatar.jpg',
                followers: 90,
                following: 45,
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [2.6, '2024-01-15T10:30:00Z', 'regular-post-id'],
                        },
                    ],
                },
            };

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(new Map());
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachUserInteractions').mockImplementation((tweets: any) =>
                Promise.resolve(
                    tweets.map((tweet) => ({
                        ...tweet,
                        is_liked: false,
                        is_reposted: false,
                        is_bookmarked: false,
                    }))
                )
            );

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].type).toBe('post');
            expect(result.data[0].parent_tweet).toBeUndefined();
            expect(result.data[0].conversation_tweet).toBeUndefined();
        });

        it('should return empty array when no tweets provided', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const result = await (service as any).attachUserInteractions([], current_user_id);

            expect(result).toEqual([]);
            expect(data_source.query).not.toHaveBeenCalled();
        });

        it('should attach interactions to main tweet', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.TWEET,
                content: 'Test tweet',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 0,
                    is_bookmarked: 1,
                    is_following: 1,
                    is_follower: 0,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(1);
            expect(result[0].is_liked).toBe(true);
            expect(result[0].is_reposted).toBe(false);
            expect(result[0].is_bookmarked).toBe(true);
            expect(result[0].user.is_following).toBe(true);
            expect(result[0].user.is_follower).toBe(false);
        });

        it('should filter out tweet when main interaction is blocked', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.TWEET,
                content: 'Test tweet',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'blockeduser',
                },
            };

            data_source.query.mockResolvedValueOnce([]);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(0);
        });

        it('should attach interactions to tweet with parent_tweet', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.QUOTE,
                content: 'Quote tweet',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
                parent_tweet: {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    type: TweetType.TWEET,
                    content: 'Original tweet',
                    user: {
                        id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'originaluser',
                    },
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
                {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    user_id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                    is_liked: 0,
                    is_reposted: 1,
                    is_bookmarked: 1,
                    is_following: 1,
                    is_follower: 1,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(1);
            expect(result[0].is_liked).toBe(true);
            expect(result[0].parent_tweet.is_liked).toBe(false);
            expect(result[0].parent_tweet.is_reposted).toBe(true);
            expect(result[0].parent_tweet.is_bookmarked).toBe(true);
            expect(result[0].parent_tweet.user.is_following).toBe(true);
            expect(result[0].parent_tweet.user.is_follower).toBe(true);
        });

        it('should filter out quote tweet when parent interaction is missing', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.QUOTE,
                content: 'Quote tweet',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
                parent_tweet: {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    type: TweetType.TWEET,
                    content: 'Blocked original tweet',
                    user: {
                        id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'blockeduser',
                    },
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(0);
        });

        it('should attach interactions to tweet with conversation_tweet', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.REPLY,
                content: 'Reply tweet',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
                parent_tweet: {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    type: TweetType.TWEET,
                    content: 'Parent tweet',
                    user: {
                        id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'parentuser',
                    },
                },
                conversation_tweet: {
                    tweet_id: 'c3d4e5f6-g7h8-9012-cdef-gh3456789012',
                    type: TweetType.TWEET,
                    content: 'Conversation root',
                    user: {
                        id: '3c0g1128-87dd-6gc6-c836-gee8c656gg16',
                        username: 'rootuser',
                    },
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
                {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    user_id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                    is_liked: 0,
                    is_reposted: 1,
                    is_bookmarked: 0,
                    is_following: 1,
                    is_follower: 0,
                },
                {
                    tweet_id: 'c3d4e5f6-g7h8-9012-cdef-gh3456789012',
                    user_id: '3c0g1128-87dd-6gc6-c836-gee8c656gg16',
                    is_liked: 1,
                    is_reposted: 1,
                    is_bookmarked: 1,
                    is_following: 0,
                    is_follower: 1,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(1);
            expect(result[0].is_liked).toBe(true);
            expect(result[0].parent_tweet.is_reposted).toBe(true);
            expect(result[0].parent_tweet.user.is_following).toBe(true);
            expect(result[0].conversation_tweet.is_liked).toBe(true);
            expect(result[0].conversation_tweet.is_bookmarked).toBe(true);
            expect(result[0].conversation_tweet.user.is_follower).toBe(true);
        });

        it('should filter out reply when parent interaction is missing', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.REPLY,
                content: 'Reply tweet',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
                parent_tweet: {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    type: TweetType.TWEET,
                    content: 'Blocked parent',
                    user: {
                        id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'blockeduser',
                    },
                },
                conversation_tweet: {
                    tweet_id: 'c3d4e5f6-g7h8-9012-cdef-gh3456789012',
                    type: TweetType.TWEET,
                    content: 'Conversation root',
                    user: {
                        id: '3c0g1128-87dd-6gc6-c836-gee8c656gg16',
                        username: 'rootuser',
                    },
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
                {
                    tweet_id: 'c3d4e5f6-g7h8-9012-cdef-gh3456789012',
                    user_id: '3c0g1128-87dd-6gc6-c836-gee8c656gg16',
                    is_liked: 1,
                    is_reposted: 1,
                    is_bookmarked: 1,
                    is_following: 0,
                    is_follower: 1,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(0);
        });

        it('should filter out reply when conversation interaction is missing', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.REPLY,
                content: 'Reply tweet',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
                parent_tweet: {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    type: TweetType.TWEET,
                    content: 'Parent tweet',
                    user: {
                        id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'parentuser',
                    },
                },
                conversation_tweet: {
                    tweet_id: 'c3d4e5f6-g7h8-9012-cdef-gh3456789012',
                    type: TweetType.TWEET,
                    content: 'Blocked conversation root',
                    user: {
                        id: '3c0g1128-87dd-6gc6-c836-gee8c656gg16',
                        username: 'blockeduser',
                    },
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
                {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    user_id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                    is_liked: 0,
                    is_reposted: 1,
                    is_bookmarked: 0,
                    is_following: 1,
                    is_follower: 0,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(0);
        });

        it('should handle multiple tweets with mixed interactions', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweets = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    type: TweetType.TWEET,
                    content: 'First tweet',
                    user: {
                        id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'user1',
                    },
                },
                {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    type: TweetType.TWEET,
                    content: 'Second tweet',
                    user: {
                        id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                        username: 'user2',
                    },
                },
            ];

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 1,
                    is_bookmarked: 1,
                    is_following: 1,
                    is_follower: 1,
                },
                {
                    tweet_id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
                    user_id: '2b9f0017-76cc-5fb5-b725-fdd7b545ff05',
                    is_liked: 0,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                mock_tweets,
                current_user_id
            );

            expect(result).toHaveLength(2);
            expect(result[0].is_liked).toBe(true);
            expect(result[0].is_reposted).toBe(true);
            expect(result[1].is_liked).toBe(false);
            expect(result[1].is_reposted).toBe(false);
        });

        it('should handle tweet without parent_tweet when parent_interaction is undefined', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.TWEET,
                content: 'Tweet without parent',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 1,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(1);
            expect(result[0].parent_tweet).toBeUndefined();
        });

        it('should handle tweet without conversation_tweet when conversation_interaction is undefined', async () => {
            const current_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: TweetType.TWEET,
                content: 'Tweet without conversation',
                user: {
                    id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    username: 'testuser',
                },
            };

            const mock_interactions = [
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    is_liked: 0,
                    is_reposted: 0,
                    is_bookmarked: 0,
                    is_following: 0,
                    is_follower: 0,
                },
            ];

            data_source.query.mockResolvedValueOnce(mock_interactions);

            const result = await (service as any).attachUserInteractions(
                [mock_tweet],
                current_user_id
            );

            expect(result).toHaveLength(1);
            expect(result[0].conversation_tweet).toBeUndefined();
        });

        it('should return empty result on elasticsearch error', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
            };

            elasticsearch_service.search.mockRejectedValueOnce(new Error('Elasticsearch error'));

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            });
        });
    });

    describe('searchLatestPosts', () => {
        it('should return empty result when query is empty', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: '',
                limit: 20,
            };

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            });
            expect(elasticsearch_service.search).not.toHaveBeenCalled();
        });

        it('should search latest posts sorted by created_at', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: 'latest',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'tweet',
                content: 'Latest post',
                created_at: '2024-01-16T10:30:00Z',
                updated_at: '2024-01-16T10:30:00Z',
                num_likes: 5,
                num_reposts: 2,
                num_views: 50,
                num_replies: 1,
                num_quotes: 0,
                author_id: 'author-id',
                username: 'alyaali',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/latest-avatar.jpg',
                followers: 75,
                following: 40,
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                '2024-01-16T10:30:00Z',
                                2.5,
                                '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            ],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);

            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    sort: [
                        { created_at: { order: 'desc' } },
                        { _score: { order: 'desc' } },
                        { tweet_id: { order: 'desc' } },
                    ],
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].tweet_id).toBe('0c059899-f706-4c8f-97d7-ba2e9fc22d6d');
        });

        it('should search latest posts with cursor', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const cursor = Buffer.from(
                JSON.stringify([
                    '2024-01-16T10:30:00Z',
                    2.5,
                    '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                ])
            ).toString('base64');
            const query_dto: SearchQueryDto = {
                query: 'latest',
                limit: 20,
                cursor,
            };

            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'tweet',
                content: 'Next post',
                created_at: '2024-01-16T09:30:00Z',
                updated_at: '2024-01-16T09:30:00Z',
                num_likes: 3,
                num_reposts: 1,
                num_views: 30,
                num_replies: 0,
                num_quotes: 0,
                author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Next Alyaa Ali',
                avatar_url: 'https://example.com/next-avatar.jpg',
                followers: 60,
                following: 30,
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                '2024-01-16T09:30:00Z',
                                2.0,
                                '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            ],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);

            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    search_after: [
                        '2024-01-16T10:30:00Z',
                        2.5,
                        '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    ],
                }),
            });

            expect(result.data).toHaveLength(1);
        });

        it('should return empty result on elasticsearch error', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: 'latest',
                limit: 20,
            };

            elasticsearch_service.search.mockRejectedValueOnce(new Error('Elasticsearch error'));

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            });
        });

        it('should search posts with username filter', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
                username: 'alyaa242',
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'This is a post with images',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                images: ['https://example.com/image1.jpg'],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    type: 'tweet',
                    content: 'This is a post with images',
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z',
                    num_likes: 10,
                    num_reposts: 5,
                    num_views: 100,
                    num_replies: 3,
                    num_quotes: 2,
                    images: ['https://example.com/image1.jpg'],
                    videos: [],
                    user: {
                        id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        username: 'alyaa242',
                        name: 'Alyaa Ali',
                        avatar_url: 'https://example.com/avatar.jpg',
                        followers: 100,
                        following: 50,
                        is_follower: false,
                        is_following: false,
                    },
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    should: expect.arrayContaining([
                                        expect.objectContaining({
                                            multi_match: expect.objectContaining({
                                                query: 'technology',
                                            }),
                                        }),
                                    ]),
                                    filter: expect.arrayContaining([
                                        {
                                            term: {
                                                username: 'alyaa242',
                                            },
                                        },
                                    ]),
                                }),
                            }),
                            functions: expect.arrayContaining([
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_likes',
                                    }),
                                }),
                            ]),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].user.username).toBe('alyaa242');
        });

        it('should search latest posts with hashtag query and apply trending hashtag boost', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Post with #technology',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: ['#technology'],
                images: ['https://example.com/image1.jpg'],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            const trending_hashtags = new Map([
                ['#technology', 150],
                ['#ai', 100],
            ]);

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(
                trending_hashtags
            );
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    must: expect.arrayContaining([
                                        {
                                            term: {
                                                hashtags: {
                                                    value: '#technology',
                                                    boost: 10,
                                                },
                                            },
                                        },
                                    ]),
                                }),
                            }),
                            functions: expect.arrayContaining([
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_likes',
                                    }),
                                }),
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_reposts',
                                    }),
                                }),
                                expect.objectContaining({
                                    filter: expect.objectContaining({
                                        term: {
                                            hashtags: { value: '#technology' },
                                        },
                                    }),
                                    weight: expect.any(Number),
                                }),
                            ]),
                            boost_mode: 'sum',
                            score_mode: 'sum',
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].content).toContain('#technology');
        });

        it('should search latest posts with both hashtag and text query with trending boost', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology AI innovation',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Post about AI innovation with #technology',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 15,
                num_reposts: 8,
                num_views: 200,
                num_replies: 5,
                num_quotes: 3,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: ['#technology'],
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                3.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            const trending_hashtags = new Map([
                ['#technology', 200],
                ['#ai', 150],
            ]);

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(
                trending_hashtags
            );
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            query: expect.objectContaining({
                                bool: expect.objectContaining({
                                    must: expect.arrayContaining([
                                        {
                                            term: {
                                                hashtags: {
                                                    value: '#technology',
                                                    boost: 10,
                                                },
                                            },
                                        },
                                    ]),
                                    should: expect.arrayContaining([
                                        expect.objectContaining({
                                            multi_match: expect.objectContaining({
                                                query: expect.stringContaining('AI'),
                                                fields: expect.arrayContaining([
                                                    'content^3',
                                                    'username^2',
                                                    'name',
                                                ]),
                                            }),
                                        }),
                                    ]),
                                    minimum_should_match: 1,
                                }),
                            }),
                            functions: expect.any(Array),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
        });

        it('should apply boosting in latest posts with empty trending hashtags map', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'tweet',
                content: 'Post about technology',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/avatar.jpg',
                followers: 100,
                following: 50,
                hashtags: [],
                images: [],
                videos: [],
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: mock_tweet,
                            sort: [
                                2.5,
                                '2024-01-15T10:30:00Z',
                                'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            ],
                        },
                    ],
                },
            };

            jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(new Map());
            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

            jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
            jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
                {
                    ...mock_tweet,
                    is_liked: false,
                    is_reposted: false,
                    is_bookmarked: false,
                },
            ]);

            const result = await service.searchLatestPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: expect.objectContaining({
                        function_score: expect.objectContaining({
                            functions: expect.arrayContaining([
                                expect.objectContaining({
                                    field_value_factor: expect.objectContaining({
                                        field: 'num_likes',
                                    }),
                                }),
                            ]),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
        });
    });

    it('should search latest posts with multiple hashtags', async () => {
        const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
        const query_dto: PostsSearchDto = {
            query: '#technology #ai #innovation',
            limit: 20,
        };

        const mock_tweet = {
            tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            type: 'tweet',
            content: 'Post with multiple hashtags #technology #ai #innovation',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z',
            num_likes: 20,
            num_reposts: 10,
            num_views: 300,
            num_replies: 8,
            num_quotes: 5,
            author_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
            username: 'alyaa242',
            name: 'Alyaa Ali',
            avatar_url: 'https://example.com/avatar.jpg',
            followers: 100,
            following: 50,
            hashtags: ['#technology', '#ai', '#innovation'],
            images: [],
            videos: [],
        };

        const mock_elasticsearch_response = {
            hits: {
                hits: [
                    {
                        _source: mock_tweet,
                        sort: [5.0, '2024-01-15T10:30:00Z', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
                    },
                ],
            },
        };

        const trending_hashtags = new Map([
            ['#technology', 200],
            ['#ai', 250],
            ['#innovation', 180],
        ]);

        jest.spyOn(service as any, 'getTrendingHashtags').mockResolvedValueOnce(trending_hashtags);
        elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
        elasticsearch_service.mget.mockResolvedValueOnce({ docs: [] } as any);

        jest.spyOn(service as any, 'attachRelatedTweets').mockResolvedValueOnce([mock_tweet]);
        jest.spyOn(service as any, 'attachUserInteractions').mockResolvedValueOnce([
            {
                ...mock_tweet,
                is_liked: false,
                is_reposted: false,
                is_bookmarked: false,
            },
        ]);

        const result = await service.searchLatestPosts(current_user_id, query_dto);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].content).toContain('#technology');
        expect(result.data[0].content).toContain('#ai');
        expect(result.data[0].content).toContain('#innovation');
    });

    describe('getMentionSuggestions', () => {
        it('should return empty array when query is empty', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto = { query: '' };

            const result = await service.getMentionSuggestions(current_user_id, query_dto);

            expect(result).toEqual([]);
        });

        it('should return user suggestions for mentions', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto = { query: 'alya' };

            const mock_query_builder = user_repository.createQueryBuilder() as any;
            mock_query_builder.getRawMany.mockResolvedValueOnce([
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    username: 'alyaali',
                    name: 'Alyaa Ali',
                    avatar_url: 'https://example.com/blah.jpg',
                    is_following: true,
                    is_follower: false,
                },
                {
                    user_id: '0c059299-f706-4c8f-97d7-ba2e9fc22d6d',
                    username: 'alyaa242',
                    name: 'Alyaaa Eissa',
                    avatar_url: 'https://example.com/johnny.jpg',
                    is_following: false,
                    is_follower: true,
                },
            ]);

            const result = await service.getMentionSuggestions(current_user_id, query_dto);

            expect(result).toHaveLength(2);
            expect(result[0].username).toBe('alyaali');
            expect(result[1].username).toBe('alyaa242');
        });

        it('should limit mention suggestions to 10 users', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto = { query: 'user' };

            const mock_users = Array.from({ length: 15 }, (_, i) => ({
                user_id: `user-${i}`,
                username: `user${i}`,
                name: `User ${i}`,
                avatar_url: `https://example.com/user${i}.jpg`,
                is_following: false,
                is_follower: false,
            }));

            const mock_query_builder = user_repository.createQueryBuilder() as any;
            mock_query_builder.getRawMany.mockResolvedValueOnce(mock_users.slice(0, 10));

            const result = await service.getMentionSuggestions(current_user_id, query_dto);

            expect(result.length).toBeLessThanOrEqual(10);
        });
    });

    describe('extractSuggestionsFromHits', () => {
        const trending_hashtags = new Map([
            ['#javascript', 150],
            ['#ai', 100],
        ]);

        it('should extract hashtag suggestions from hits', () => {
            const hits = [
                {
                    _source: {
                        hashtags: ['#javascript', '#nodejs', '#typescript'],
                        content: 'Learning javascript today',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                '#java',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('#javascript');
            expect(result[0].is_trending).toBe(true);
        });

        it('should return empty array when text is null or undefined', () => {
            const hits = [
                {
                    _source: {
                        content: null,
                    },
                },
                {
                    _source: {},
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'test',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(0);
        });

        it('should return empty array when query not found in text', () => {
            const hits = [
                {
                    _source: {
                        content: 'This is a post about something completely different',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(0);
        });

        it('should skip completion when length is less than query + 3', () => {
            const hits = [
                {
                    _source: {
                        content: 'test a',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'test',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(0);
        });

        it('should skip completion when it does not start with query', () => {
            const hits = [
                {
                    _source: {
                        content: 'prefix test something else that is different',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'blah',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(0);
        });

        it('should skip completion when middle content contains punctuation', () => {
            const hits = [
                {
                    _source: {
                        content: 'test!',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'test',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(0);
        });

        it('should extract valid completion from content', () => {
            const hits = [
                {
                    _source: {
                        content: 'javascript is amazing for web development. Other stuff.',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('javascript is amazing for web development');
            expect(result[0].is_trending).toBe(false);
        });

        it('should extract completion from highlighted content', () => {
            const hits = [
                {
                    _source: {
                        content: 'javascript is great',
                    },
                    highlight: {
                        content: ['<MARK>javascript</MARK> is awesome for coding'],
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('javascript is awesome for coding');
        });

        it('should remove MARK tags from highlighted content', () => {
            const hits = [
                {
                    highlight: {
                        content: ['<MARK>test</MARK> content with <MARK>marks</MARK>'],
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'test',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).not.toContain('<MARK>');
            expect(result[0].query).not.toContain('</MARK>');
        });

        it('should trim and remove trailing punctuation from completion', () => {
            const hits = [
                {
                    _source: {
                        content: 'javascript is amazing for development,,,',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('javascript is amazing for development');
        });

        it('should limit completion length to sentence end', () => {
            const hits = [
                {
                    _source: {
                        content: 'javascript is great. This is another sentence.',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('javascript is great');
        });

        it('should sort suggestions with trending first, then by length', () => {
            const hits = [
                {
                    _source: {
                        hashtags: ['#javascript', '#js'],
                    },
                },
                {
                    _source: {
                        hashtags: ['#ai', '#artificial'],
                    },
                },
                {
                    _source: {
                        hashtags: ['#test'],
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                '#',
                trending_hashtags,
                5
            );

            expect(result[0].is_trending).toBe(true);
            expect(result[1].is_trending).toBe(true);
            if (result.length > 2) {
                expect(result[2].is_trending).toBe(false);
            }
        });

        it('should handle case-insensitive query matching', () => {
            const hits = [
                {
                    _source: {
                        content: 'JavaScript is awesome for development',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('JavaScript is awesome for development');
        });

        it('should handle hashtag query without # prefix', () => {
            const hits = [
                {
                    _source: {
                        hashtags: ['#javascript', '#java'],
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'java',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('#javascript');
        });

        it('should return early when hashtag matches in loop', () => {
            const hits = [
                {
                    _source: {
                        hashtags: ['#test1', '#javascript', '#test2'],
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                '#java',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('#javascript');
        });

        it('should handle newline as sentence end', () => {
            const hits = [
                {
                    _source: {
                        content: 'javascript is amazing\nNew line content',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('javascript is amazing');
        });

        it('should handle exclamation mark as sentence end', () => {
            const hits = [
                {
                    _source: {
                        content: 'javascript is fantastic! More content here',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('javascript is fantastic');
        });

        it('should handle question mark as sentence end', () => {
            const hits = [
                {
                    _source: {
                        content: 'javascript is good? Maybe not',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'javascript',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('javascript is good');
        });

        it('should sort non-trending suggestions by length', () => {
            const hits = [
                {
                    _source: {
                        content: 'test is short',
                    },
                },
                {
                    _source: {
                        content: 'test is a very long completion',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(hits, 'test', new Map(), 3);

            expect(result).toHaveLength(2);
            expect(result[0].query.length).toBeLessThan(result[1].query.length);
        });

        it('should handle empty hashtags array', () => {
            const hits = [
                {
                    _source: {
                        hashtags: [],
                        content: 'test content here',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'test',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
            expect(result[0].query).toBe('test content here');
        });

        it('should handle non-array hashtags', () => {
            const hits = [
                {
                    _source: {
                        hashtags: 'not-an-array',
                        content: 'test content here',
                    },
                },
            ];

            const result = (service as any).extractSuggestionsFromHits(
                hits,
                'test',
                trending_hashtags,
                3
            );

            expect(result).toHaveLength(1);
        });
    });
});
