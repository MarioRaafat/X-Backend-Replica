import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { UserRepository } from 'src/user/user.repository';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { DataSource } from 'typeorm';
import { RedisService } from 'src/redis/redis.service';

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
                            _source: { content: 'Check out #technology' },
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

        it('should search posts and return results without related tweets', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'post',
                content: 'This is a post about technology',
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
                                    must: [],
                                    should: expect.any(Array),
                                }),
                            }),

                            functions: expect.any(Array),
                            boost_mode: 'sum',
                            score_mode: 'sum',
                        }),
                    }),

                    size: 21,
                    sort: [
                        { _score: { order: 'desc' } },
                        { created_at: { order: 'desc' } },
                        { tweet_id: { order: 'desc' } },
                    ],
                }),
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].tweet_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
            expect(result.data[0].content).toBe('This is a post about technology');
            expect(result.pagination.has_more).toBe(false);
            expect(result.pagination.next_cursor).toBe(null);
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
                type: 'post',
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
                type: 'post',
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
                    type: 'post',
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

        it('should search posts with hashtag query', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'post',
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
                                    should: expect.any(Array),
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

        it('should search posts with both hashtag and text query', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology AI innovation',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'post',
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
                                }),
                            }),
                        }),
                    }),
                }),
            });

            expect(result.data).toHaveLength(1);
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
                type: 'post',
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
                    type: 'post',
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
                    type: 'post',
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
                type: 'post',
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
                name: 'Alyaa Ali',
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

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce(mock_mget_response as any);

            jest.spyOn(service as any, 'attachUserInteractions').mockImplementation((tweets: any) =>
                Promise.resolve(
                    tweets.map((tweet) => ({
                        ...tweet,
                        is_liked: false,
                        is_reposted: false,
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
                type: 'post',
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
                type: 'post',
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
                type: 'post',
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
                    type: 'post',
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

        it('should search posts with hashtag query', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: '#technology',
                limit: 20,
            };

            const mock_tweet = {
                tweet_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                type: 'post',
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
                                    should: expect.any(Array),
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
});
