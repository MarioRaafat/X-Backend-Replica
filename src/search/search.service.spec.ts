import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { UserRepository } from 'src/user/user.repository';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostsSearchDto } from './dto/post-search.dto';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';

describe('SearchService', () => {
    let service: SearchService;
    let elasticsearch_service: jest.Mocked<ElasticsearchService>;
    let user_repository: jest.Mocked<UserRepository>;

    beforeEach(async () => {
        const mock_elasticsearch_service = {
            search: jest.fn(),
            mget: jest.fn(),
        };

        const mock_user_repository = {};

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchService,
                { provide: ElasticsearchService, useValue: mock_elasticsearch_service },
                { provide: UserRepository, useValue: mock_user_repository },
            ],
        }).compile();

        service = module.get<SearchService>(SearchService);
        elasticsearch_service = module.get(ElasticsearchService);
        user_repository = module.get(UserRepository);
    });

    afterEach(() => jest.clearAllMocks());

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('searchUsers', () => {
        it('should return empty result when query is empty', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: '',
                limit: 20,
            };

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            });
            expect(elasticsearch_service.search).not.toHaveBeenCalled();
        });

        it('should return empty result when query is only whitespace', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: '   ',
                limit: 20,
            };

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
            });
            expect(elasticsearch_service.search).not.toHaveBeenCalled();
        });

        it('should search users and return results without cursor', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: 'alyaa',
                limit: 20,
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
                                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                                username: 'alyaa242',
                                name: 'Alyaa Ali',
                                bio: 'Software developer',
                                country: 'Egypt',
                                followers: 100,
                                following: 50,
                                verified: true,
                                avatar_url: 'https://example.com/blah.jpg',
                            },
                            sort: [1.5, 50, '1a8e9906-65bb-4fa4-a614-ecc6a434ee94'],
                        },
                        {
                            _source: {
                                user_id: '2b9f9906-65bb-4fa4-a614-ecc6a434ee95',
                                username: 'alyaali',
                                name: 'Aliaa Eissa',
                                bio: 'blah',
                                country: 'Egypt',
                                followers: 50,
                                following: 30,
                                verified: false,
                                avatar_url: 'https://example.com/blah.jpg',
                            },
                            sort: [1.2, 50, '2b9f9906-65bb-4fa4-a614-ecc6a434ee95'],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: 'users',
                body: {
                    query: {
                        bool: {
                            must: [
                                {
                                    multi_match: {
                                        query: 'alyaa',
                                        fields: [
                                            'username^3',
                                            'username.autocomplete^2',
                                            'name^2',
                                            'name.autocomplete',
                                            'bio',
                                        ],
                                        type: 'best_fields',
                                        fuzziness: 'AUTO',
                                        prefix_length: 1,
                                        operator: 'or',
                                    },
                                },
                            ],
                            filter: [],
                        },
                    },
                    size: 21,
                    sort: [
                        { _score: { order: 'desc' } },
                        { followers: { order: 'desc' } },
                        { user_id: { order: 'desc' } },
                    ],
                },
            });

            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toEqual({
                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                username: 'alyaa242',
                name: 'Alyaa Ali',
                bio: 'Software developer',
                country: 'Egypt',
                followers: 100,
                following: 50,
                verified: true,
                avatar_url: 'https://example.com/blah.jpg',
            });
            expect(result.pagination.has_more).toBe(false);
            expect(result.pagination.next_cursor).toBeNull();
        });

        it('should search users and return results with cursor when has more', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: 'alyaa',
                limit: 2,
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
                                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                                username: 'alyaa242',
                                name: 'Alyaa Ali',
                                bio: 'Software developer',
                                country: 'Egypt',
                                followers: 100,
                                following: 50,
                                verified: true,
                                avatar_url: 'https://example.com/blah.jpg',
                            },
                            sort: [1.5, 100, '1a8e9906-65bb-4fa4-a614-ecc6a434ee94'],
                        },
                        {
                            _source: {
                                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                                username: 'alyaali',
                                name: 'Aliaa Eissa',
                                bio: 'Software developer',
                                country: 'Egypt',
                                followers: 100,
                                following: 50,
                                verified: true,
                                avatar_url: 'https://example.com/blah.jpg',
                            },
                            sort: [1.2, 50, '2b9f9906-65bb-4fa4-a614-ecc6a434ee95'],
                        },
                        {
                            _source: {
                                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                                username: 'alyaa123',
                                name: 'Alyaa 123',
                                bio: 'Software developer',
                                country: 'Egypt',
                                followers: 100,
                                following: 50,
                                verified: true,
                                avatar_url: 'https://example.com/blah.jpg',
                            },
                            sort: [1.0, 200, '3c9f9906-65bb-4fa4-a614-ecc6a434ee96'],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(result.data).toHaveLength(2);
            expect(result.pagination.has_more).toBe(true);
            expect(result.pagination.next_cursor).toBeTruthy();
        });

        it('should search users with cursor', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const cursor = Buffer.from(
                JSON.stringify([1.2, 50, '2b9f9906-65bb-4fa4-a614-ecc6a434ee95'])
            ).toString('base64');
            const query_dto: SearchQueryDto = {
                query: 'alyaa',
                limit: 20,
                cursor,
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
                                user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                                username: 'alyaa242',
                                name: 'Alyaa Ali',
                                bio: 'Software developer',
                                country: 'Egypt',
                                followers: 100,
                                following: 50,
                                verified: true,
                                avatar_url: 'https://example.com/blah.jpg',
                            },
                            sort: [1.0, 200, '3c9f9906-65bb-4fa4-a614-ecc6a434ee96'],
                        },
                    ],
                },
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: 'users',
                body: {
                    query: {
                        bool: {
                            must: [
                                {
                                    multi_match: {
                                        query: 'alyaa',
                                        fields: [
                                            'username^3',
                                            'username.autocomplete^2',
                                            'name^2',
                                            'name.autocomplete',
                                            'bio',
                                        ],
                                        type: 'best_fields',
                                        fuzziness: 'AUTO',
                                        prefix_length: 1,
                                        operator: 'or',
                                    },
                                },
                            ],
                            filter: [],
                        },
                    },
                    size: 21,
                    sort: [
                        { _score: { order: 'desc' } },
                        { followers: { order: 'desc' } },
                        { user_id: { order: 'desc' } },
                    ],
                    search_after: [1.2, 50, '2b9f9906-65bb-4fa4-a614-ecc6a434ee95'],
                },
            });

            expect(result.data).toHaveLength(1);
        });

        it('should return empty result on elasticsearch error', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: 'alyaa',
                limit: 20,
            };

            elasticsearch_service.search.mockRejectedValueOnce(new Error('Elasticsearch error'));

            const result = await service.searchUsers(current_user_id, query_dto);

            expect(result).toEqual({
                data: [],
                pagination: {
                    next_cursor: null,
                    has_more: false,
                },
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

        it('should search posts and return results without related tweets', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
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
                            },
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

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: {
                        bool: {
                            must: [
                                {
                                    multi_match: {
                                        query: 'technology',
                                        fields: ['content^3', 'username^2', 'name'],
                                        type: 'best_fields',
                                        fuzziness: 'AUTO',
                                        prefix_length: 1,
                                        operator: 'or',
                                    },
                                },
                            ],
                            should: expect.any(Array),
                        },
                    },
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
        });

        it('should search posts with media filter', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'technology',
                limit: 20,
                has_media: true,
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
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
                            },
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

            const result = await service.searchPosts(current_user_id, query_dto);

            expect(elasticsearch_service.search).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: expect.objectContaining({
                    query: {
                        bool: {
                            must: expect.any(Array),
                            should: expect.any(Array),
                            filter: [
                                {
                                    script: {
                                        script: {
                                            source: "(doc['images'].size() > 0 || doc['videos'].size() > 0)",
                                        },
                                    },
                                },
                            ],
                        },
                    },
                }),
            });

            expect(result.data).toHaveLength(1);
        });

        it('should search posts and attach parent tweet for reply', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'reply',
                limit: 20,
            };

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
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
                            },
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
                        _source: {
                            tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            type: 'post',
                            content: 'Original post',
                            created_at: '2024-01-15T09:00:00Z',
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
                        },
                    },
                    {
                        _id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: {
                            tweet_id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                            type: 'post',
                            content: 'Conversation starter',
                            created_at: '2024-01-15T08:00:00Z',
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
                        },
                    },
                ],
            };

            elasticsearch_service.search.mockResolvedValueOnce(mock_elasticsearch_response as any);
            elasticsearch_service.mget.mockResolvedValueOnce(mock_mget_response as any);

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

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
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
                            },
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

            const mock_elasticsearch_response = {
                hits: {
                    hits: [
                        {
                            _source: {
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
                            },
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
    });

    describe('encodeCursor', () => {
        it('should encode sort array to base64 cursor', () => {
            const sort = [1.5, 100, '0c059899-f706-4c8f-97d7-ba2e9fc22d6d'];
            const result = service['encodeCursor'](sort);

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');

            const decoded = JSON.parse(Buffer.from(result as any, 'base64').toString('utf8'));
            expect(decoded).toEqual(sort);
        });

        it('should return null when sort is undefined', () => {
            const result = service['encodeCursor'](undefined);

            expect(result).toBeNull();
        });

        it('should return null when sort is null', () => {
            const result = service['encodeCursor'](null as any);

            expect(result).toBeNull();
        });
    });

    describe('decodeCursor', () => {
        it('should decode base64 cursor to sort array', () => {
            const sort = [1.5, 100, '0c059899-f706-4c8f-97d7-ba2e9fc22d6d'];
            const cursor = Buffer.from(JSON.stringify(sort)).toString('base64');

            const result = service['decodeCursor'](cursor);

            expect(result).toEqual(sort);
        });

        it('should return null when cursor is null', () => {
            const result = service['decodeCursor'](null);

            expect(result).toBeNull();
        });

        it('should return null when cursor is invalid base64', () => {
            const result = service['decodeCursor']('invalid-cursor');

            expect(result).toBeNull();
        });

        it('should return null when cursor is not valid JSON', () => {
            const invalid_cursor = Buffer.from('not-json').toString('base64');

            const result = service['decodeCursor'](invalid_cursor);

            expect(result).toBeNull();
        });
    });

    describe('mapTweet', () => {
        it('should map basic tweet without parent or conversation', () => {
            const hit = {
                _source: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    type: 'post',
                    content: 'Test content',
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z',
                    num_likes: 10,
                    num_reposts: 5,
                    num_views: 100,
                    num_replies: 3,
                    num_quotes: 2,
                    author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    username: 'alyaali',
                    name: 'Alyaa Ali',
                    avatar_url: 'https://example.com/avatar.jpg',
                    followers: 100,
                    following: 50,
                    images: ['https://example.com/image.jpg'],
                    videos: [],
                },
            };

            const result = service['mapTweet'](hit);

            expect(result).toEqual({
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'post',
                content: 'Test content',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                likes_count: 10,
                reposts_count: 5,
                views_count: 100,
                replies_count: 3,
                quotes_count: 2,
                user: {
                    id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    username: 'alyaali',
                    name: 'Alyaa Ali',
                    avatar_url: 'https://example.com/avatar.jpg',
                    followers: 100,
                    following: 100,
                },
                images: ['https://example.com/image.jpg'],
                videos: [],
            });
        });

        it('should map tweet with parent tweet', () => {
            const hit = {
                _source: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    type: 'quote',
                    content: 'Quote content',
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z',
                    num_likes: 5,
                    num_reposts: 2,
                    num_views: 50,
                    num_replies: 1,
                    num_quotes: 0,
                    author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    username: 'alyaali',
                    name: 'Alyaa Ali',
                    avatar_url: 'https://example.com/quote-avatar.jpg',
                    followers: 50,
                    following: 25,
                    images: [],
                    videos: [],
                },
            };

            const parent_source = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'post',
                content: 'Parent content',
                created_at: '2024-01-15T09:00:00Z',
                num_likes: 20,
                num_reposts: 10,
                num_views: 200,
                num_replies: 5,
                num_quotes: 3,
                author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'alyaali',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/parent-avatar.jpg',
                followers: 100,
                following: 50,
                images: [],
                videos: [],
            };

            const result = service['mapTweet'](hit, parent_source);

            expect(result['parent_tweet']).toBeDefined();
            expect(result['parent_tweet'].tweet_id).toBe('0c059899-f706-4c8f-97d7-ba2e9fc22d6d');
            expect(result['parent_tweet'].content).toBe('Parent content');
        });

        it('should map tweet with conversation tweet', () => {
            const hit = {
                _source: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    type: 'reply',
                    content: 'Reply content',
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z',
                    num_likes: 5,
                    num_reposts: 2,
                    num_views: 50,
                    num_replies: 1,
                    num_quotes: 0,
                    author_id: 'reply-author',
                    username: 'alyaali',
                    name: 'Alyaa Ali',
                    avatar_url: 'https://example.com/reply-avatar.jpg',
                    followers: 50,
                    following: 25,
                    images: [],
                    videos: [],
                },
            };

            const conversation_source = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                type: 'post',
                content: 'Conversation starter',
                created_at: '2024-01-15T08:00:00Z',
                num_likes: 30,
                num_reposts: 15,
                num_views: 300,
                num_replies: 10,
                num_quotes: 5,
                author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'alyaali',
                name: 'Alyaa Ali',
                avatar_url: 'https://example.com/conversation-avatar.jpg',
                followers: 150,
                following: 75,
                images: [],
                videos: [],
            };

            const result = service['mapTweet'](hit, undefined, conversation_source);

            expect(result['conversation_tweet']).toBeDefined();
            expect(result['conversation_tweet'].tweet_id).toBe(
                '0c059899-f706-4c8f-97d7-ba2e9fc22d6d'
            );
            expect(result['conversation_tweet'].content).toBe('Conversation starter');
        });
    });

    describe('applyTweetsBoosting', () => {
        it('should add boosting queries to search body', () => {
            const search_body = {
                query: {
                    bool: {
                        must: [],
                        should: [],
                    },
                },
            };

            service['applyTweetsBoosting'](search_body);

            expect(search_body.query.bool.should).toHaveLength(6);
            expect(search_body.query.bool.should).toContainEqual({
                function_score: {
                    field_value_factor: {
                        field: 'num_likes',
                        factor: 0.01,
                        modifier: 'log1p',
                        missing: 0,
                    },
                },
            });
            expect(search_body.query.bool.should).toContainEqual({
                function_score: {
                    field_value_factor: {
                        field: 'num_reposts',
                        factor: 0.02,
                        modifier: 'log1p',
                        missing: 0,
                    },
                },
            });
            expect(search_body.query.bool.should).toContainEqual({
                function_score: {
                    field_value_factor: {
                        field: 'followers',
                        factor: 0.001,
                        modifier: 'log1p',
                        missing: 0,
                    },
                },
            });
        });
    });

    describe('fetchRelatedTweets', () => {
        it('should fetch parent and conversation tweets', async () => {
            const tweets = [
                {
                    type: 'reply',
                    parent_id: '0c059811-f706-4c8f-97d7-ba2e9fc22d6d',
                    conversation_id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                },
                {
                    type: 'quote',
                    parent_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                },
            ];

            const mock_mget_response = {
                docs: [
                    {
                        _id: '0c059811-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: {
                            tweet_id: '0c059811-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'Parent 1',
                        },
                    },
                    {
                        _id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: {
                            tweet_id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'Conversation',
                        },
                    },
                    {
                        _id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: {
                            tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'Parent 2',
                        },
                    },
                ],
            };

            elasticsearch_service.mget.mockResolvedValueOnce(mock_mget_response as any);

            const result = await service['fetchRelatedTweets'](tweets);

            expect(elasticsearch_service.mget).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    ids: [
                        '0c059811-f706-4c8f-97d7-ba2e9fc22d6d',
                        '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                    ],
                },
            });

            expect(result.parent_map.size).toBe(2);
            expect(result.parent_map.get('0c059811-f706-4c8f-97d7-ba2e9fc22d6d')).toEqual({
                tweet_id: '0c059811-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Parent 1',
            });
            expect(result.parent_map.get('0c059899-f706-4c8f-97d7-ba2e9fc22d6d')).toEqual({
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Parent 2',
            });

            expect(result.conversation_map.size).toBe(1);
            expect(result.conversation_map.get('0c059822-f706-4c8f-97d7-ba2e9fc22d6d')).toEqual({
                tweet_id: '0c059822-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Conversation',
            });
        });

        it('should return empty maps when no parent or conversation ids', async () => {
            const tweets = [
                {
                    type: 'post',
                },
            ];

            const result = await service['fetchRelatedTweets'](tweets);

            expect(elasticsearch_service.mget).not.toHaveBeenCalled();
            expect(result.parent_map.size).toBe(0);
            expect(result.conversation_map.size).toBe(0);
        });
    });

    describe('attachRelatedTweets', () => {
        it('should attach parent and conversation tweets to items', async () => {
            const items = [
                {
                    _source: {
                        tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        type: 'reply',
                        parent_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        conversation_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        content: 'Reply content',
                        created_at: '2024-01-15T10:30:00Z',
                        updated_at: '2024-01-15T10:30:00Z',
                        num_likes: 5,
                        num_reposts: 2,
                        num_views: 50,
                        num_replies: 1,
                        num_quotes: 0,
                        author_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        username: 'alyaali',
                        name: 'Alyaa Ali',
                        avatar_url: 'https://example.com/avatar.jpg',
                        followers: 50,
                        following: 25,
                        images: [],
                        videos: [],
                    },
                },
            ];

            const mock_mget_response = {
                docs: [
                    {
                        _id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: {
                            tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'Parent content',
                        },
                    },
                    {
                        _id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        found: true,
                        _source: {
                            tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'Conversation content',
                        },
                    },
                ],
            };

            elasticsearch_service.mget.mockResolvedValueOnce(mock_mget_response as any);

            const result = await service['attachRelatedTweets'](items);

            expect(result).toHaveLength(1);
            expect(result[0].tweet_id).toBe('0c059899-f706-4c8f-97d7-ba2e9fc22d6d');
            expect(result[0].parent_tweet).toBeDefined();
            expect(result[0].conversation_tweet).toBeDefined();
        });
    });
});
