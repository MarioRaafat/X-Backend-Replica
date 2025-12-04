import { SUCCESS_MESSAGES } from '../constants/swagger-messages';
import { Tweet } from '../tweets/entities/tweet.entity';
import { User } from '../user/entities/user.entity';

export const explore_root_swagger = {
    operation: {
        summary: 'Get complete explore page data',
        description: `Retrieve all explore page sections in a single request including trending topics, who to follow suggestions, and for-you posts.`,
    },
    responses: {
        success: {
            description: 'Explore page data retrieved successfully',
            example: {
                data: {
                    trending: [
                        {
                            text: '#WorldCup2026',
                            posts_count: 45678,
                            reference_id: 'worldcup2026',
                            category: 'sports',
                            trend_rank: 1,
                        },
                        {
                            text: '#TechConference',
                            posts_count: 23456,
                            reference_id: 'techconference',
                            category: 'none',
                            trend_rank: 2,
                        },
                        {
                            text: 'New Movie Release',
                            posts_count: 18234,
                            reference_id: 'new-movie-release',
                            category: 'entertainment',
                            trend_rank: 3,
                        },
                    ],
                    who_to_follow: [
                        {
                            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            username: 'techenthusiast',
                            name: 'Tech Enthusiast',
                            bio: 'Passionate about technology, AI, and innovation. Sharing the latest tech news and insights.',
                            avatar_url: 'https://cdn.example.com/avatars/techenthusiast.jpg',
                            verified: true,
                            followers: 45678,
                            following: 892,
                            is_following: false,
                            is_followed_by: false,
                        },
                        {
                            id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                            username: 'sportsanalyst',
                            name: 'Sports Analyst',
                            bio: 'Breaking down the game | Sports statistics and analysis | Former athlete',
                            avatar_url: 'https://cdn.example.com/avatars/sportsanalyst.jpg',
                            verified: true,
                            followers: 32145,
                            following: 543,
                            is_following: false,
                            is_followed_by: true,
                        },
                        {
                            id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
                            username: 'musiclover',
                            name: 'Music Lover',
                            bio: '🎵 Music is life | Playlist curator | Concert photographer',
                            avatar_url: 'https://cdn.example.com/avatars/musiclover.jpg',
                            verified: false,
                            followers: 8234,
                            following: 1205,
                            is_following: false,
                            is_followed_by: false,
                        },
                    ],
                    for_you_posts: [
                        {
                            category: {
                                id: 1,
                                name: 'Sports',
                            },
                            posts: [
                                {
                                    tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                                    type: 'tweet',
                                    content:
                                        'Just scored the winning goal! ⚽ What an incredible match! #Football #Victory',
                                    images: ['https://cdn.example.com/images/goal-celebration.jpg'],
                                    videos: [],
                                    likes_count: 1247,
                                    reposts_count: 89,
                                    views_count: 5432,
                                    quotes_count: 34,
                                    replies_count: 156,
                                    bookmarks_count: 78,
                                    is_liked: false,
                                    is_reposted: false,
                                    is_bookmarked: false,
                                    created_at: '2025-11-23T10:30:00.000Z',
                                    updated_at: '2025-11-23T10:30:00.000Z',
                                    user: {
                                        id: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
                                        username: 'johndoe',
                                        name: 'John Doe',
                                        avatar_url: 'https://cdn.example.com/profiles/johndoe.jpg',
                                        verified: true,
                                        bio: 'Sports enthusiast | Football lover ⚽',
                                        cover_url: 'https://cdn.example.com/covers/johndoe.jpg',
                                        followers: 15234,
                                        following: 892,
                                        is_following: false,
                                        is_followed_by: false,
                                    },
                                },
                                {
                                    tweet_id: '770f0600-g41d-63f6-c938-668877662222',
                                    type: 'tweet',
                                    content:
                                        'Breaking: Championship finals set for next week! 🏆 #Sports #Championship',
                                    images: [],
                                    videos: [
                                        'https://cdn.example.com/videos/championship-preview.mp4',
                                    ],
                                    likes_count: 892,
                                    reposts_count: 156,
                                    views_count: 3421,
                                    quotes_count: 23,
                                    replies_count: 89,
                                    bookmarks_count: 45,
                                    is_liked: false,
                                    is_reposted: false,
                                    is_bookmarked: false,
                                    created_at: '2025-11-23T08:45:00.000Z',
                                    updated_at: '2025-11-23T08:45:00.000Z',
                                    user: {
                                        id: 'd9e3f1a4-5h6c-6f4d-1h2g-345678901ghi',
                                        username: 'sportsnews',
                                        name: 'Sports News',
                                        avatar_url:
                                            'https://cdn.example.com/profiles/sportsnews.jpg',
                                        verified: true,
                                        bio: 'Breaking sports news and updates 🏆 | Official sports media',
                                        cover_url: 'https://cdn.example.com/covers/sportsnews.jpg',
                                        followers: 2456789,
                                        following: 234,
                                        is_following: true,
                                        is_followed_by: false,
                                    },
                                },
                            ],
                        },
                        {
                            category: {
                                id: 2,
                                name: 'Music',
                            },
                            posts: [
                                {
                                    tweet_id: '660e9500-f30c-52e5-b827-557766551111',
                                    type: 'tweet',
                                    content:
                                        'New album dropping tonight at midnight! 🎵 Get ready! #NewMusic #AlbumRelease',
                                    images: ['https://cdn.example.com/images/album-cover.jpg'],
                                    videos: [],
                                    likes_count: 3421,
                                    reposts_count: 567,
                                    views_count: 12890,
                                    quotes_count: 89,
                                    replies_count: 445,
                                    bookmarks_count: 234,
                                    is_liked: true,
                                    is_reposted: false,
                                    is_bookmarked: true,
                                    created_at: '2025-11-23T09:15:00.000Z',
                                    updated_at: '2025-11-23T09:15:00.000Z',
                                    user: {
                                        id: 'a7c2e9f3-4g5b-5e3c-0g1f-234567890def',
                                        username: 'musicartist',
                                        name: 'Music Artist',
                                        avatar_url: 'https://cdn.example.com/profiles/artist.jpg',
                                        verified: true,
                                        bio: '🎵 Singer | Songwriter | Producer | New album out now!',
                                        cover_url: 'https://cdn.example.com/covers/artist.jpg',
                                        followers: 567890,
                                        following: 1234,
                                        is_following: true,
                                        is_followed_by: true,
                                    },
                                },
                            ],
                        },
                        {
                            category: {
                                id: 3,
                                name: 'Entertainment',
                            },
                            posts: [
                                {
                                    tweet_id: '880g1711-h52e-74g7-d049-779988773333',
                                    type: 'tweet',
                                    content:
                                        'I dont think the casual Hunger Games films fans realise how deeply traumatising and genuinely heartbreaking Sunrise on the Reaping is about to be. 🎬',
                                    images: [],
                                    videos: [],
                                    likes_count: 5621,
                                    reposts_count: 892,
                                    views_count: 18234,
                                    quotes_count: 156,
                                    replies_count: 678,
                                    bookmarks_count: 412,
                                    is_liked: false,
                                    is_reposted: true,
                                    is_bookmarked: false,
                                    created_at: '2025-11-22T18:30:00.000Z',
                                    updated_at: '2025-11-22T18:30:00.000Z',
                                    user: {
                                        id: 'e0f4g2b5-6i7d-7g5e-2i3h-456789012jkl',
                                        username: 'moviebuff',
                                        name: 'Cinema Enthusiast',
                                        avatar_url:
                                            'https://cdn.example.com/profiles/moviebuff.jpg',
                                        verified: false,
                                        bio: '🎬 Film critic | Movie reviews | Hunger Games superfan',
                                        cover_url: 'https://cdn.example.com/covers/moviebuff.jpg',
                                        followers: 8934,
                                        following: 456,
                                        is_following: false,
                                        is_followed_by: true,
                                    },
                                },
                            ],
                        },
                    ],
                },
                count: 1,
                message: SUCCESS_MESSAGES.EXPLORE_DATA_RETRIEVED,
            },
        },
        internal_error: {
            description: 'Internal server error',
            example: {
                message: 'Internal server error',
                error: 'Internal Server Error',
                status_code: 500,
            },
        },
    },
};

export const search_latest_posts = {
    operation: {
        summary: 'Get latest posts for explore',
        description: `Retrieve latest personalized posts for the explore/for-you feed with optional category filtering.`,
    },
    queries: {
        category: {
            name: 'category',
            required: false,
            description: 'Filter posts by category to see content from specific topics',
            enum: ['sports', 'music', 'news', 'entertainment'],
            example: 'sports',
            schema: {
                type: 'string',
                enum: ['sports', 'music', 'news', 'entertainment'],
            },
        },
    },
    responses: {
        success: {
            description: 'Latest posts retrieved successfully',
            type: Tweet,
            example: {
                data: [
                    {
                        category: {
                            id: 1,
                            name: 'Sports',
                        },
                        posts: [
                            {
                                tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                                type: 'tweet',
                                content:
                                    'Just scored the winning goal! ⚽ What an incredible match! #Football #Victory',
                                images: ['https://cdn.example.com/images/goal-celebration.jpg'],
                                videos: [],
                                likes_count: 1247,
                                reposts_count: 89,
                                views_count: 5432,
                                quotes_count: 34,
                                replies_count: 156,
                                bookmarks_count: 78,
                                is_liked: false,
                                is_reposted: false,
                                is_bookmarked: false,
                                created_at: '2025-11-23T10:30:00.000Z',
                                updated_at: '2025-11-23T10:30:00.000Z',
                                user: {
                                    id: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
                                    username: 'johndoe',
                                    name: 'John Doe',
                                    avatar_url: 'https://cdn.example.com/profiles/johndoe.jpg',
                                    verified: true,
                                    bio: 'Sports enthusiast | Football lover ⚽',
                                    cover_url: 'https://cdn.example.com/covers/johndoe.jpg',
                                    followers: 15234,
                                    following: 892,
                                    is_following: false,
                                    is_followed_by: false,
                                },
                            },
                        ],
                    },
                    {
                        category: {
                            id: 2,
                            name: 'Music',
                        },
                        posts: [
                            {
                                tweet_id: '660e9500-f30c-52e5-b827-557766551111',
                                type: 'tweet',
                                content:
                                    'New album dropping tonight at midnight! 🎵 Get ready! #NewMusic #AlbumRelease',
                                images: ['https://cdn.example.com/images/album-cover.jpg'],
                                videos: [],
                                likes_count: 3421,
                                reposts_count: 567,
                                views_count: 12890,
                                quotes_count: 89,
                                replies_count: 445,
                                bookmarks_count: 234,
                                is_liked: true,
                                is_reposted: false,
                                is_bookmarked: true,
                                created_at: '2025-11-23T09:15:00.000Z',
                                updated_at: '2025-11-23T09:15:00.000Z',
                                user: {
                                    id: 'a7c2e9f3-4g5b-5e3c-0g1f-234567890def',
                                    username: 'musicartist',
                                    name: 'Music Artist',
                                    avatar_url: 'https://cdn.example.com/profiles/artist.jpg',
                                    verified: true,
                                    bio: '🎵 Singer | Songwriter | Producer | New album out now!',
                                    cover_url: 'https://cdn.example.com/covers/artist.jpg',
                                    followers: 567890,
                                    following: 1234,
                                    is_following: true,
                                    is_followed_by: true,
                                },
                            },
                        ],
                    },
                ],
                count: 2,
                message: SUCCESS_MESSAGES.EXPLORE_FOR_YOU_POSTS_RETRIEVED,
            },
        },
        bad_request: {
            description: 'Invalid query parameters',
            example: {
                message: 'Invalid category parameter',
                error: 'Bad Request',
                status_code: 400,
            },
        },
        internal_error: {
            description: 'Internal server error',
            example: {
                message: 'Internal server error',
                error: 'Internal Server Error',
                status_code: 500,
            },
        },
    },
};

export const trending_swagger = {
    operation: {
        summary: 'Get trending topics and hashtags',
        description: `Retrieve currently trending topics and hashtags with optional category and country filtering.`,
    },
    queries: {
        category: {
            name: 'category',
            required: false,
            description:
                'Filter trending items by category. Select a category to see trends in that specific area, or choose "none" for general trends.',
            enum: ['none', 'sports', 'entertainment'],
            example: 'sports',
            schema: {
                type: 'string',
                enum: ['none', 'sports', 'entertainment'],
                default: 'none',
            },
        },
        country: {
            name: 'country',
            required: false,
            description:
                'Filter by country code using ISO 3166-1 alpha-2 format. Leave empty for global trends. Examples: US (United States), GB (United Kingdom), EG (Egypt), AE (UAE), SA (Saudi Arabia), CA (Canada), AU (Australia), IN (India), BR (Brazil), FR (France), DE (Germany), JP (Japan)',
            example: 'US',
            schema: {
                type: 'string',
                pattern: '^[A-Z]{2}$',
                minLength: 2,
                maxLength: 2,
            },
        },
    },
    responses: {
        success: {
            description: 'Trending items retrieved successfully',
            example: {
                data: [
                    {
                        text: '#WorldCup2026',
                        posts_count: 45678,
                        reference_id: 'worldcup2026',
                        category: 'sports',
                        trend_rank: 1,
                    },
                    {
                        text: '#TechConference',
                        posts_count: 23456,
                        reference_id: 'techconference',
                        category: 'none',
                        trend_rank: 2,
                    },
                    {
                        text: 'New Movie Release',
                        posts_count: 18234,
                        reference_id: 'new-movie-release',
                        category: 'entertainment',
                        trend_rank: 3,
                    },
                    {
                        text: '#ClimateAction',
                        posts_count: 15890,
                        reference_id: 'climateaction',
                        category: 'news',
                        trend_rank: 4,
                    },
                    {
                        text: 'Champions League',
                        posts_count: 12567,
                        reference_id: 'champions-league',
                        category: 'sports',
                        trend_rank: 5,
                    },
                ],
                count: 5,
                message: SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED,
            },
        },
        bad_request: {
            description: 'Invalid query parameters',
            example: {
                message: 'Invalid query parameters',
                error: 'Bad Request',
                status_code: 400,
            },
        },
        internal_error: {
            description: 'Internal server error',
            example: {
                message: 'Internal server error',
                error: 'Internal Server Error',
                status_code: 500,
            },
        },
    },
};

export const who_to_follow_swagger = {
    operation: {
        summary: 'Get personalized user recommendations',
        description: `Retrieve personalized user recommendations to help discover new accounts to follow.`,
    },
    responses: {
        success: {
            description: 'Who to follow suggestions retrieved successfully',
            type: User,
            example: {
                data: [
                    {
                        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        name: 'Tech Enthusiast',
                        username: 'techenthusiast',
                        bio: 'Passionate about technology, AI, and innovation. Sharing the latest tech news and insights.',
                        avatar_url: 'https://cdn.example.com/avatars/techenthusiast.jpg',
                        verified: true,
                        followers: 45678,
                        following: 892,
                        is_following: false,
                        is_followed_by: false,
                    },
                    {
                        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                        name: 'Sports Analyst',
                        username: 'sportsanalyst',
                        bio: 'Breaking down the game | Sports statistics and analysis | Former athlete',
                        avatar_url: 'https://cdn.example.com/avatars/sportsanalyst.jpg',
                        verified: true,
                        followers: 32145,
                        following: 543,
                        is_following: false,
                        is_followed_by: true,
                    },
                    {
                        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
                        name: 'Music Lover',
                        username: 'musiclover',
                        bio: '🎵 Music is life | Playlist curator | Concert photographer',
                        avatar_url: 'https://cdn.example.com/avatars/musiclover.jpg',
                        verified: false,
                        followers: 8234,
                        following: 1205,
                        is_following: false,
                        is_followed_by: false,
                    },
                    {
                        id: 'd4e5f6a7-b8c9-0123-def1-234567890123',
                        name: 'News Reporter',
                        username: 'newsreporter',
                        bio: 'Journalist | Breaking news and investigative reporting | Truth matters',
                        avatar_url: 'https://cdn.example.com/avatars/newsreporter.jpg',
                        verified: true,
                        followers: 67890,
                        following: 321,
                        is_following: true,
                        is_followed_by: false,
                    },
                    {
                        id: 'e5f6a7b8-c9d0-1234-ef12-345678901234',
                        name: 'Comedy Central',
                        username: 'comedycentral',
                        bio: 'Daily laughs and entertainment 😂 | Memes | Comedy clips',
                        avatar_url: 'https://cdn.example.com/avatars/comedycentral.jpg',
                        verified: false,
                        followers: 15432,
                        following: 678,
                        is_following: false,
                        is_followed_by: false,
                    },
                ],
                count: 5,
                message: SUCCESS_MESSAGES.EXPLORE_WHO_TO_FOLLOW_RETRIEVED,
            },
        },
        internal_error: {
            description: 'Internal server error',
            example: {
                message: 'Internal server error',
                error: 'Internal Server Error',
                status_code: 500,
            },
        },
    },
};
export const category_wise_trending_swagger = {
    operation: {
        summary: 'Get trending posts for a specific category',
        description:
            'Retrieve trending posts for a specific category based on the category ID. Returns a list of tweets sorted by trending score.',
    },
    params: {
        category_id: {
            name: 'category_id',
            required: true,
            description: 'The ID of the category to fetch trending posts for',
            example: '1',
            schema: { type: 'string' },
        },
    },
    responses: {
        success: {
            description: 'Category trending posts retrieved successfully',
            type: Tweet,
            example: {
                data: [
                    {
                        tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                        type: 'tweet',
                        content: 'Breaking news! Just witnessed an incredible moment! 🔥 #Trending',
                        images: ['https://cdn.example.com/images/tweet1.jpg'],
                        videos: [],
                        likes_count: 2345,
                        reposts_count: 567,
                        views_count: 12340,
                        quotes_count: 89,
                        replies_count: 234,
                        bookmarks_count: 156,
                        is_liked: false,
                        is_reposted: false,
                        is_bookmarked: false,
                        created_at: '2025-12-04T10:30:00.000Z',
                        updated_at: '2025-12-04T10:30:00.000Z',
                        user: {
                            id: 'd9e3f1a4-5h6c-6f4d-1h2g-345678901ghi',
                            username: 'trendingsource',
                            name: 'Trending News',
                            avatar_url: 'https://cdn.example.com/profiles/trendingsource.jpg',
                            verified: true,
                            bio: 'Your source for trending content 🌟',
                            cover_url: 'https://cdn.example.com/covers/trendingsource.jpg',
                            followers: 125678,
                            following: 456,
                            is_following: false,
                            is_followed_by: false,
                        },
                    },
                ],
                count: 20,
                message: SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED,
            },
        },
        internal_error: {
            description: 'Internal server error',
            example: {
                message: 'Internal server error',
                error: 'Internal Server Error',
                status_code: 500,
            },
        },
    },
};
