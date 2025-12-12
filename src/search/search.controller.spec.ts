import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { BasicQueryDto } from './dto/basic-query.dto';
import { UserListResponseDto } from 'src/user/dto/user-list-response.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { TweetListResponseDto } from './dto/tweet-list-response.dto';
import { TweetType } from 'src/shared/enums/tweet-types.enum';
import { TweetResponseDTO } from 'src/tweets/dto';
import { PostsSearchDto } from './dto/post-search.dto';

describe('SearchController', () => {
    let controller: SearchController;
    let search_service: jest.Mocked<SearchService>;

    beforeEach(async () => {
        const mock_search_service = {
            getSuggestions: jest.fn(),
            searchUsers: jest.fn(),
            searchPosts: jest.fn(),
            searchLatestPosts: jest.fn(),
            getMentionSuggestions: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SearchController],
            providers: [{ provide: SearchService, useValue: mock_search_service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile();

        controller = module.get<SearchController>(SearchController);
        search_service = module.get(SearchService);
    });

    afterEach(() => jest.clearAllMocks());

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getSuggestions', () => {
        it('should call search_service.getSuggestions with the current user id and query dto', async () => {
            const mock_response = {
                suggested_queries: [
                    { query: 'alyaa', is_trending: true },
                    { query: 'alia', is_trending: true },
                    { query: 'ali', is_trending: true },
                ],
                suggested_users: [
                    {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        is_following: true,
                        is_follower: false,
                    },
                    {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alia Mohamed',
                        username: 'alyaa#222',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        is_following: false,
                        is_follower: false,
                    },
                ],
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: BasicQueryDto = {
                query: 'aly',
            };

            const get_suggestions = jest
                .spyOn(search_service, 'getSuggestions')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getSuggestions(current_user_id, query_dto);

            expect(get_suggestions).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(get_suggestions).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('searchPeople', () => {
        it('should call search_service.searchUsers with the current user id and query dto', async () => {
            const mock_response: UserListResponseDto = {
                data: [
                    {
                        user_id: 'ffd712d1-6bdb-402d-a4cd-a083910eca96',
                        name: 'Blowgan',
                        username: 'BogalinaWow',
                        bio: 'https://t.co/UTBRrtOOXI',
                        avatar_url:
                            'https://pbs.twimg.com/profile_images/1975000639454208000/qP6Lj05M_normal.jpg',
                        cover_url:
                            'https://pbs.twimg.com/profile_images/1975000639454208000/qP6Lj05M_normal.jpg',
                        verified: false,
                        followers: 17,
                        following: 200,
                        is_following: false,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: false,
                    },
                    {
                        user_id: 'ffd19c65-2d77-46ca-9aed-53b4afe67c85',
                        name: 'topp530',
                        username: 'topp530',
                        bio: 'blah',
                        avatar_url:
                            'https://pbs.twimg.com/profile_images/1802933092153208832/Z8iF2yfF_normal.jpg',
                        cover_url:
                            'https://pbs.twimg.com/profile_images/1802933092153208832/Z8iF2yfF_normal.jpg',
                        verified: false,
                        followers: 200,
                        following: 200,
                        is_following: false,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: false,
                    },
                ],
                pagination: {
                    next_cursor: '2025-11-19T12:38:24.295Z_ffd19c65-2d77-46ca-9aed-53b4afe67c85',
                    has_more: true,
                },
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: SearchQueryDto = {
                query: 'alya',
                cursor: null,
                limit: 10,
            };

            const search_users = jest
                .spyOn(search_service, 'searchUsers')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.searchPeople(current_user_id, query_dto);

            expect(search_users).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(search_users).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('searchPosts', () => {
        it('should call search_service.searchPosts with the current user id and query dto', async () => {
            const mock_response: TweetListResponseDto = {
                data: [
                    {
                        tweet_id: 'a606119b-fada-4775-92de-699a04ba1461',
                        type: TweetType.QUOTE,
                        content: 'This is my first quote!',
                        images: [
                            'https://example.com/image1.jpg',
                            'https://example.com/image2.jpg',
                        ],
                        videos: ['https://example.com/video1.mp4'],
                        user: {
                            id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                            username: 'alyaa2242',
                            name: 'Alyaa Eissa',
                            avatar_url: 'blah.jpg',
                            verified: false,
                            bio: 'blah',
                            cover_url: 'blah.jpg',
                            followers: 2,
                            following: 1,
                        },
                        parent_tweet: {
                            tweet_id: 'a1ba7ee3-f290-41f3-acaa-b5369d656794',
                            type: TweetType.TWEET,
                            content: 'This is my 5 tweet!',
                            images: [
                                'https://example.com/image1.jpg',
                                'https://example.com/image2.jpg',
                            ],
                            videos: ['https://example.com/video1.mp4'],
                            user: {
                                id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                                username: 'alyaa2242',
                                name: 'Alyaa Eissa',
                                avatar_url: 'blah.jpg',
                                verified: false,
                                bio: 'blah',
                                cover_url: 'blah.jpg',
                                followers: 2,
                                following: 1,
                            },
                            created_at: new Date('2025-11-19T09:46:08.261915'),
                        } as TweetResponseDTO,
                        likes_count: 1,
                        reposts_count: 1,
                        views_count: 0,
                        quotes_count: 0,
                        replies_count: 0,
                        is_liked: true,
                        is_reposted: true,
                        created_at: new Date('2025-11-19T07:47:18.478Z'),
                        updated_at: new Date('2025-11-19T08:59:18.907Z'),
                    },
                ],
                pagination: {
                    next_cursor: '2025-11-19T07:46:08.261Z_a1ba7ee3-f290-41f3-acaa-b5369d656794',
                    has_more: true,
                },
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'quote',
                cursor: '2025-11-19T07:46:08.261Z_a1ba7ee3-f290-41f3-acaa-b5369d656794',
                limit: 10,
            };

            const search_posts = jest
                .spyOn(search_service, 'searchPosts')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.searchPosts(current_user_id, query_dto);

            expect(search_posts).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(search_posts).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('searchLatestPosts', () => {
        it('should call search_service.searchLatestPosts with the current user id and query dto', async () => {
            const mock_response: TweetListResponseDto = {
                data: [
                    {
                        tweet_id: 'a606119b-fada-4775-92de-699a04ba1461',
                        type: TweetType.QUOTE,
                        content: 'This is my first quote!',
                        images: [
                            'https://example.com/image1.jpg',
                            'https://example.com/image2.jpg',
                        ],
                        videos: ['https://example.com/video1.mp4'],
                        user: {
                            id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                            username: 'alyaa2242',
                            name: 'Alyaa Eissa',
                            avatar_url: 'blah.jpg',
                            verified: false,
                            bio: 'blah',
                            cover_url: 'blah.jpg',
                            followers: 2,
                            following: 1,
                        },
                        parent_tweet: {
                            tweet_id: 'a1ba7ee3-f290-41f3-acaa-b5369d656794',
                            type: TweetType.TWEET,
                            content: 'This is my 5 tweet!',
                            images: [
                                'https://example.com/image1.jpg',
                                'https://example.com/image2.jpg',
                            ],
                            videos: ['https://example.com/video1.mp4'],
                            user: {
                                id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                                username: 'alyaa2242',
                                name: 'Alyaa Eissa',
                                avatar_url: 'blah.jpg',
                                verified: false,
                                bio: 'blah',
                                cover_url: 'blah.jpg',
                                followers: 2,
                                following: 1,
                            },
                            created_at: new Date('2025-11-19T09:46:08.261915'),
                        } as TweetResponseDTO,
                        likes_count: 1,
                        reposts_count: 1,
                        views_count: 0,
                        quotes_count: 0,
                        replies_count: 0,
                        is_liked: true,
                        is_reposted: true,
                        created_at: new Date('2025-11-19T07:47:18.478Z'),
                        updated_at: new Date('2025-11-19T08:59:18.907Z'),
                    },
                ],
                pagination: {
                    next_cursor: '2025-11-19T07:46:08.261Z_a1ba7ee3-f290-41f3-acaa-b5369d656794',
                    has_more: true,
                },
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PostsSearchDto = {
                query: 'quote',
                cursor: '2025-11-19T07:46:08.261Z_a1ba7ee3-f290-41f3-acaa-b5369d656794',
                limit: 10,
            };

            const search_posts = jest
                .spyOn(search_service, 'searchLatestPosts')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.searchLatestPosts(current_user_id, query_dto);

            expect(search_posts).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(search_posts).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('getMentionSuggestions', () => {
        it('should call search_service.getMentionSuggestions with the current user id and query dto', async () => {
            const mock_response = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                },
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alia Mohamed',
                    username: 'alyaa#222',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: false,
                    is_follower: false,
                },
            ];

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: BasicQueryDto = {
                query: 'aly',
            };

            const get_suggestions = jest
                .spyOn(search_service, 'getMentionSuggestions')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getMentionSuggestions(current_user_id, query_dto);

            expect(get_suggestions).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(get_suggestions).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });
});
