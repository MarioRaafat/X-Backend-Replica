import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_suggestions_swagger = {
    operation: {
        summary: 'Get suggestions of a query',
        description: `
    Get relevant suggestions of queries and people for a given query
    `,
    },

    responses: {
        success: {
            description: 'Search suggestions retrieved successfully',
            schema: {
                example: {
                    data: {
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
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.SUGGESTIONS_RETRIEVED,
                },
            },
        },
    },
};

export const search_users_swagger = {
    operation: {
        summary: 'Search users',
        description: `
    Get users search results
    `,
    },

    responses: {
        success: {
            description: 'User search results retrieved successfully',
            schema: {
                example: {
                    data: {
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
                                bio: null,
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
                            next_cursor:
                                '2025-11-19T12:38:24.295Z_ffd19c65-2d77-46ca-9aed-53b4afe67c85',
                            has_more: true,
                        },
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.SEARCH_USERS_RETRIEVED,
                },
            },
        },
    },
};

export const search_posts = {
    operation: {
        summary: 'Search posts',
        description: `
    Retrieve posts result of a search query.

    Each returned post includes its author, content, engagement counts, and creation date.

    Each post has a user object that has all needed user data.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A quote has a parent_tweet object that has all needed data of the quoted tweet.

    - **Reply Post:**  
      A post that replies to one or more users.
      Each reply has:
      - **Parent Tweet:**  
          The tweet that the reply replies to.

      - **Conversation Tweet:**  
          The original root tweet of the whole reply series.    `,
    },

    responses: {
        success: {
            description: 'Posts search results retrieved successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                tweet_id: 'a606119b-fada-4775-92de-699a04ba1461',
                                type: 'quote',
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
                                    avatar_url: null,
                                    verified: false,
                                    bio: null,
                                    cover_url: null,
                                    followers: 2,
                                    following: 1,
                                },
                                parent_tweet: {
                                    tweet_id: 'a1ba7ee3-f290-41f3-acaa-b5369d656794',
                                    type: 'tweet',
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
                                        avatar_url: null,
                                        verified: false,
                                        bio: null,
                                        cover_url: null,
                                        followers: 2,
                                        following: 1,
                                    },
                                    created_at: '2025-11-19T09:46:08.261915',
                                },
                                likes_count: 1,
                                reposts_count: 1,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 0,
                                is_liked: true,
                                is_reposted: true,
                                created_at: '2025-11-19T07:47:18.478Z',
                                updated_at: '2025-11-19T08:59:18.907Z',
                            },
                            {
                                tweet_id: '7711de75-0bee-48e3-a229-71541df71d95',
                                type: 'reply',
                                content: 'Third reply',
                                images: [
                                    'https://example.com/image1.jpg',
                                    'https://example.com/image2.jpg',
                                ],
                                videos: ['https://example.com/video1.mp4'],
                                user: {
                                    id: '0e7c4fe8-34a1-4b3d-9885-31b93cd226f4',
                                    username: 'alyaa2#242',
                                    name: 'Alyaa 2',
                                    avatar_url: null,
                                    verified: false,
                                    bio: null,
                                    cover_url: null,
                                    followers: 1,
                                    following: 0,
                                    is_following: false,
                                    is_follower: false,
                                },
                                parent_tweet: {
                                    tweet_id: '9b1a6a33-4a20-414e-a91e-ee7400f80d18',
                                    type: 'reply',
                                    content: 'Second reply',
                                    images: [
                                        'https://example.com/image1.jpg',
                                        'https://example.com/image2.jpg',
                                    ],
                                    videos: ['https://example.com/video1.mp4'],
                                    user: {
                                        id: '0e7c4fe8-34a1-4b3d-9885-31b93cd226f4',
                                        username: 'alyaa2#242',
                                        name: 'Alyaa 2',
                                        avatar_url: null,
                                        verified: false,
                                        bio: null,
                                        cover_url: null,
                                        followers: 1,
                                        following: 0,
                                        is_following: false,
                                        is_follower: false,
                                    },
                                    likes_count: 0,
                                    reposts_count: 0,
                                    views_count: 0,
                                    quotes_count: 0,
                                    replies_count: 1,
                                    is_bookmarked: false,
                                    created_at: '2025-11-21T11:03:15.503653',
                                },
                                conversation_tweet: {
                                    tweet_id: '9b1a6a33-4a20-414e-a91e-ee7400f80d18',
                                    type: 'reply',
                                    content: 'Second reply',
                                    images: [
                                        'https://example.com/image1.jpg',
                                        'https://example.com/image2.jpg',
                                    ],
                                    videos: ['https://example.com/video1.mp4'],
                                    user: {
                                        id: '0e7c4fe8-34a1-4b3d-9885-31b93cd226f4',
                                        username: 'alyaa2#242',
                                        name: 'Alyaa 2',
                                        avatar_url: null,
                                        verified: false,
                                        bio: null,
                                        cover_url: null,
                                        followers: 1,
                                        following: 0,
                                        is_following: false,
                                        is_follower: false,
                                    },
                                    likes_count: 0,
                                    reposts_count: 0,
                                    views_count: 0,
                                    quotes_count: 0,
                                    replies_count: 1,
                                    is_bookmarked: false,
                                    created_at: '2025-11-21T11:03:15.503653',
                                },
                                likes_count: 0,
                                reposts_count: 0,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 0,
                                is_bookmarked: false,
                                created_at: '2025-11-21T09:08:19.803Z',
                                updated_at: '2025-11-21T09:08:19.803Z',
                            },
                        ],
                        pagination: {
                            next_cursor:
                                '2025-11-19T07:46:08.261Z_a1ba7ee3-f290-41f3-acaa-b5369d656794',
                            has_more: true,
                        },
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.SEARCH_POSTS_RETRIEVED,
                },
            },
        },
    },
};

export const search_latest_posts = {
    operation: {
        summary: 'Search latest posts',
        description: `
  Retrieve a list of latest posts.

    Each returned post includes its author, content, engagement counts, and creation date.

    Each post has a user object that has all needed user data.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A quote has a parent_tweet object that has all needed data of the quoted tweet.

    - **Reply Post:**  
      A post that replies to one or more users.
      Each reply has:
      - **Parent Tweet:**  
          The tweet that the reply replies to.

      - **Conversation Tweet:**  
          The original root tweet of the whole reply series.
      `,
    },

    responses: {
        success: {
            description: 'Latest posts search results retrieved successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                tweet_id: 'a606119b-fada-4775-92de-699a04ba1461',
                                type: 'quote',
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
                                    avatar_url: null,
                                    verified: false,
                                    bio: null,
                                    cover_url: null,
                                    followers: 2,
                                    following: 1,
                                },
                                parent_tweet: {
                                    tweet_id: 'a1ba7ee3-f290-41f3-acaa-b5369d656794',
                                    type: 'tweet',
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
                                        avatar_url: null,
                                        verified: false,
                                        bio: null,
                                        cover_url: null,
                                        followers: 2,
                                        following: 1,
                                    },
                                    created_at: '2025-11-19T09:46:08.261915',
                                },
                                likes_count: 1,
                                reposts_count: 1,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 0,
                                is_liked: true,
                                is_reposted: true,
                                created_at: '2025-11-19T07:47:18.478Z',
                                updated_at: '2025-11-19T08:59:18.907Z',
                            },
                            {
                                tweet_id: 'a1ba7ee3-f290-41f3-acaa-b5369d656794',
                                type: 'tweet',
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
                                    avatar_url: null,
                                    verified: false,
                                    bio: null,
                                    cover_url: null,
                                    followers: 2,
                                    following: 1,
                                },
                                parent_tweet: null,
                                likes_count: 1,
                                reposts_count: 1,
                                views_count: 0,
                                quotes_count: 1,
                                replies_count: 1,
                                is_liked: true,
                                is_reposted: true,
                                created_at: '2025-11-19T07:46:08.261Z',
                                updated_at: '2025-11-19T08:01:23.611Z',
                            },
                        ],
                        pagination: {
                            next_cursor:
                                '2025-11-19T07:46:08.261Z_a1ba7ee3-f290-41f3-acaa-b5369d656794',
                            has_more: true,
                        },
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED,
                },
            },
        },
    },
};

export const get_mention_suggestions_swagger = {
    operation: {
        summary: 'Get mention suggestions',
        description: `
    Get relevant suggestions of people for a given query
    `,
    },

    responses: {
        success: {
            description: 'Search suggestions retrieved successfully',
            schema: {
                example: {
                    data: [
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
                    count: 2,
                    message: SUCCESS_MESSAGES.SUGGESTIONS_RETRIEVED,
                },
            },
        },
    },
};
