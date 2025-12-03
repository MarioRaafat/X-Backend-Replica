import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_users_by_ids = {
    operation: {
        summary: "Get users' data by their IDs",
        description: `
    Get a list of users' data.
    IDs are passed as a comma separated string of users IDs in query parameters
    If no authenticated current  user, no relationship flags are returned
    `,
    },

    responses: {
        success: {
            description: 'Users retrieved successfully',
            schema: {
                example: {
                    data: [
                        {
                            identifier: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            success: true,
                            user: {
                                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                name: 'Alyaa Ali',
                                username: 'Alyaali242',
                                bio: 'hi there!',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                                is_following: true,
                                is_follower: false,
                                is_muted: false,
                                is_blocked: true,
                            },
                        },
                        {
                            user_id: '12345678-f706-4c8f-97d7-ba2e9fc22d6d',
                            success: false,
                            user: null,
                        },
                    ],
                    count: 2,
                    message: SUCCESS_MESSAGES.USERS_RETRIEVED,
                },
            },
        },
    },
};

export const get_users_by_username = {
    operation: {
        summary: "Get users' data by their usernames",
        description: `
    Get a list of users' data.
    Usernames are passed as a comma separated string of usernames in query parameters
    If no authenticated current  user, no relationship flags are returned
    `,
    },

    responses: {
        success: {
            description: 'Users retrieved successfully',
            schema: {
                example: {
                    data: [
                        {
                            identifier: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            success: true,
                            user: {
                                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                name: 'Alyaa Ali',
                                username: 'Alyaali242',
                                bio: 'hi there!',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                                is_following: true,
                                is_follower: false,
                                is_muted: false,
                                is_blocked: true,
                            },
                        },
                        {
                            user_id: '12345678-f706-4c8f-97d7-ba2e9fc22d6d',
                            success: false,
                            user: null,
                        },
                    ],
                    count: 2,
                    message: SUCCESS_MESSAGES.USERS_RETRIEVED,
                },
            },
        },
    },
};

export const get_me = {
    operation: {
        summary: 'Get current user',
        description: `
    Get current user detailed data needed for displaying the profile
    `,
    },

    responses: {
        success: {
            description: 'User retrieved successfully',
            schema: {
                example: {
                    data: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                        followers_count: 5,
                        following_count: 15,
                        country: 'Egypt',
                        created_at: '2025-10-30',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.USER_RETRIEVED,
                },
            },
        },
    },
};

export const get_user_by_id = {
    operation: {
        summary: 'Get user by id',
        description: `
    Get user detailed data needed for displaying the profile by ID 
    `,
    },

    responses: {
        success: {
            description: 'User retrieved successfully',
            schema: {
                example: {
                    data: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                        followers_count: 5,
                        following_count: 15,
                        country: 'Egypt',
                        created_at: '2025-10-30',
                        is_follower: true,
                        is_following: false,
                        is_muted: false,
                        is_blocked: true,
                        top_mutual_followers: [
                            {
                                name: 'Mario Raafat',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            },
                            {
                                name: 'Amira Khalid',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            },
                        ],
                        mutual_followers_count: 5,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.USER_RETRIEVED,
                },
            },
        },
    },
};

export const get_user_by_username = {
    operation: {
        summary: 'Get user by username',
        description: `
    Get user detailed data needed for displaying the profile by username
    `,
    },

    responses: {
        success: {
            description: 'User retrieved successfully',
            schema: {
                example: {
                    data: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                        followers_count: 5,
                        following_count: 15,
                        country: 'Egypt',
                        created_at: '2025-10-30',
                        is_follower: true,
                        is_following: false,
                        is_muted: false,
                        is_blocked: true,
                        top_mutual_followers: [
                            {
                                name: 'Mario Raafat',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            },
                            {
                                name: 'Amira Khalid',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            },
                        ],
                        mutual_followers_count: 5,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.USER_RETRIEVED,
                },
            },
        },
    },
};

export const get_followers = {
    operation: {
        summary: "Get user's followers",
        description: `
    Get user's list of followers by user ID
    
    Optional flag 'following' for filtering followers that you only follow
    `,
    },

    responses: {
        success: {
            description: 'Followers retrieved successfully',
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
                    message: SUCCESS_MESSAGES.FOLLOWERS_LIST_RETRIEVED,
                },
            },
        },
    },
};

export const remove_follower = {
    operation: {
        summary: 'Remove follower',
        description: `
    Remove a follower by ID     
    `,
    },

    responses: {
        success: {
            description: 'Follower removed successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.FOLLOWER_REMOVED,
                },
            },
        },
    },
};

export const get_following = {
    operation: {
        summary: "Get user's following list",
        description: `
    Get user's following list by ID   
    `,
    },

    responses: {
        success: {
            description: 'Following list retrieved successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                user_id: '15897b72-ad4c-4e10-97e0-3d421da75459',
                                name: 'Alyaa Eissa',
                                username: 'alyaa3242',
                                bio: null,
                                avatar_url: null,
                                cover_url: null,
                                verified: false,
                                followers: 1,
                                following: 1,
                                is_following: true,
                                is_follower: true,
                                is_muted: false,
                                is_blocked: false,
                                created_at: '2025-11-19T12:39:19.245Z',
                            },
                        ],
                        pagination: {
                            next_cursor:
                                '2025-11-19T12:39:19.245Z_15897b72-ad4c-4e10-97e0-3d421da75459',
                            has_more: false,
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.FOLLOWING_LIST_RETRIEVED,
                },
            },
        },
    },
};

export const follow_user = {
    operation: {
        summary: 'Follow user',
        description: `
    Follow user by ID
    `,
    },

    responses: {
        success: {
            description: 'Followed user successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.FOLLOW_USER,
                },
            },
        },
    },
};

export const unfollow_user = {
    operation: {
        summary: 'Unfollow user',
        description: `
    Unfollow user by ID
    `,
    },

    responses: {
        success: {
            description: 'Unfollowed user successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.UNFOLLOW_USER,
                },
            },
        },
    },
};

export const get_muted = {
    operation: {
        summary: "Get user's muted list",
        description: `
    Get current user's muted list by ID   
    `,
    },

    responses: {
        success: {
            description: 'Muted list retrieved successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                user_id: '3d8fdaab-ba27-446f-8dac-3f341f761a1b',
                                name: 'Sirenity🤍',
                                username: '3ternalsirenity',
                                bio: 'She/Her | Music Enthusiast | Vinyl Record Collector',
                                avatar_url:
                                    'https://pbs.twimg.com/profile_images/1926003650607931392/CxwrqR_P_normal.jpg',
                                cover_url:
                                    'https://pbs.twimg.com/profile_images/1926003650607931392/CxwrqR_P_normal.jpg',
                                verified: true,
                                followers: 200,
                                following: 200,
                                is_following: false,
                                is_follower: false,
                                is_muted: true,
                                is_blocked: true,
                                created_at: '2025-11-19T19:55:56.077Z',
                            },
                        ],
                        pagination: {
                            next_cursor:
                                '2025-11-19T19:55:56.077Z_3d8fdaab-ba27-446f-8dac-3f341f761a1b',
                            has_more: false,
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.MUTED_LIST_RETRIEVED,
                },
            },
        },
    },
};

export const mute_user = {
    operation: {
        summary: 'Mute user',
        description: `
    Mute user by ID
    `,
    },

    responses: {
        success: {
            description: 'Muted user successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.MUTE_USER,
                },
            },
        },
    },
};

export const unmute_user = {
    operation: {
        summary: 'Unmute user',
        description: `
    Unmute user by ID
    `,
    },

    responses: {
        success: {
            description: 'Unmuted user successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.UNMUTE_USER,
                },
            },
        },
    },
};

export const get_blocked = {
    operation: {
        summary: "Get user's blocked list",
        description: `
    Get current user's blocked list by ID   
    `,
    },

    responses: {
        success: {
            description: 'Blocked list retrieved successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                user_id: '3d8fdaab-ba27-446f-8dac-3f341f761a1b',
                                name: 'Sirenity🤍',
                                username: '3ternalsirenity',
                                bio: 'She/Her | Music Enthusiast | Vinyl Record Collector',
                                avatar_url:
                                    'https://pbs.twimg.com/profile_images/1926003650607931392/CxwrqR_P_normal.jpg',
                                cover_url:
                                    'https://pbs.twimg.com/profile_images/1926003650607931392/CxwrqR_P_normal.jpg',
                                verified: true,
                                followers: 200,
                                following: 200,
                                is_following: false,
                                is_follower: false,
                                is_muted: true,
                                is_blocked: true,
                                created_at: '2025-11-19T19:57:52.119Z',
                            },
                        ],
                        pagination: {
                            next_cursor:
                                '2025-11-19T19:57:52.119Z_3d8fdaab-ba27-446f-8dac-3f341f761a1b',
                            has_more: false,
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.BLOCKED_LIST_RETRIEVED,
                },
            },
        },
    },
};

export const block_user = {
    operation: {
        summary: 'Block user',
        description: `
    Block user by ID
    `,
    },

    responses: {
        success: {
            description: 'Blocked user successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.BLOCK_USER,
                },
            },
        },
    },
};

export const unblock_user = {
    operation: {
        summary: 'Unblock user',
        description: `
    Unblock user by ID
    `,
    },

    responses: {
        success: {
            description: 'Unblocked user successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.UNBLOCK_USER,
                },
            },
        },
    },
};

export const get_liked_posts = {
    operation: {
        summary: 'Get liked posts',
        description: `
    Retrieve a list of posts that the authenticated user has liked.

    Each returned post includes its content, engagement counts, and creation date.

    Each post has a user object that has all needed user data.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A quote has a parent_tweet object that has all needed data of the quoted tweet.

    - **Reply Post:**  
      A post that replies to one or more users.
      Reply has same data as a normal post, a "replies_to" array of users can be added later.      
    `,
    },

    responses: {
        success: {
            description: 'Retrieved liked posts successfully',
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
                    message: SUCCESS_MESSAGES.LIKED_POSTS_RETRIEVED,
                },
            },
        },
    },
};

export const get_user_posts = {
    operation: {
        summary: "Get user's posts",
        description: `
    Retrieve a list of posts that a user have.

    Each returned post includes its content, engagement counts, and creation date.

    Each post has a user object that has all needed user data.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Repost:**  
      Repost's data is the same data of the original post, but with type "repost" instead.

    - **Quote Post:**  
      A quote has a parent_tweet object that has all needed data of the quoted tweet.
    `,
    },

    responses: {
        success: {
            description: 'Retrieved posts successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                tweet_id: 'd65ff0f3-0ea9-4d14-bcd3-d0be6148e763',
                                type: 'quote',
                                content: 'This is my first quote!',
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
                                    tweet_id: '01f7a402-0e8e-4a1c-8ed6-ecc2fb80a402',
                                    type: 'tweet',
                                    content: 'This is my first tweet!',
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
                                    likes_count: 1,
                                    reposts_count: 0,
                                    views_count: 0,
                                    quotes_count: 1,
                                    replies_count: 1,
                                    is_bookmarked: false,
                                    created_at: '2025-11-21T11:00:49.7671',
                                },
                                likes_count: 0,
                                reposts_count: 0,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 0,
                                is_liked: false,
                                is_reposted: false,
                                is_bookmarked: false,
                                created_at: '2025-11-21T09:12:58.446Z',
                                updated_at: '2025-11-21T09:12:58.446Z',
                            },
                        ],
                        pagination: {
                            next_cursor:
                                '2025-11-19T11:47:37.206Z_0cc8dec0-149a-46e4-a7c9-b3040d976ff5',
                            has_more: true,
                        },
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.POSTS_RETRIEVED,
                },
            },
        },
    },
};

export const get_user_replies = {
    operation: {
        summary: "Get user's replies",
        description: `
    Retrieve a list of posts that the authenticated user has liked.

    Each returned post includes its content, engagement counts, and creation date.

    Each post has a user object that has all needed user data.

    Each reply has:

    - **Parent Tweet:**  
      The tweet that the reply replies to.

    - **Conversation Tweet:**  
        The original root tweet of the whole reply series.

    Both have their detailed data.
    `,
    },

    responses: {
        success: {
            description: 'Retrieved replies successfully',
            schema: {
                example: {
                    data: [
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
                    count: 3,
                    message: SUCCESS_MESSAGES.REPLIES_RETRIEVED,
                },
            },
        },
    },
};

export const get_user_media = {
    operation: {
        summary: "Get user's media",
        description: `
    Retrieve a list of posts that include media.

    Each returned post includes its author, content, engagement counts, and creation date.

    Each post has a user object that has all needed user data.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A quote has the same data as a normal post.

    - **Reply Post:**  
      A post that replies to one or more users.  
      Reply has same data as a normal post, a "replies_to" array of users can be added later.      
    `,
    },

    responses: {
        success: {
            description: 'Retrieved media successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                tweet_id: '0cc8dec0-149a-46e4-a7c9-b3040d976ff5',
                                type: 'quote',
                                content: 'Weeeeeeee!',
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
                                likes_count: 0,
                                reposts_count: 0,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 0,
                                created_at: '2025-11-19T11:47:37.206Z',
                                updated_at: '2025-11-19T11:47:37.206Z',
                            },
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
                                likes_count: 1,
                                reposts_count: 1,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 0,
                                created_at: '2025-11-19T07:47:18.478Z',
                                updated_at: '2025-11-19T08:59:18.907Z',
                            },
                        ],
                        pagination: {
                            next_cursor:
                                '2025-11-19T07:47:18.478Z_a606119b-fada-4775-92de-699a04ba1461',
                            has_more: true,
                        },
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.MEDIA_RETRIEVED,
                },
            },
        },
    },
};

export const update_user = {
    operation: {
        summary: 'Update user profile',
        description: `
    Update current user profile
    `,
    },

    responses: {
        success: {
            description: 'Updated user successfully',
            schema: {
                example: {
                    data: {
                        user_id: '809334b7-d429-4d83-8e78-0418731ea97d',
                        name: 'Alyaa Ali',
                        username: 'alyaa242',
                        bio: "Hi there, I'm Alyaa",
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                        country: null,
                        created_at: '2025-10-21T09:26:17.432Z',
                        birth_date: '2003-05-14',
                        followers_count: 5,
                        following_count: 10,
                    },
                    count: 0,
                    message: SUCCESS_MESSAGES.USER_UPDATED,
                },
            },
        },
    },
};

export const delete_user = {
    operation: {
        summary: 'Delete user',
        description: `
    Delete current user permanently
    `,
    },

    responses: {
        success: {
            description: 'Account deleted successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.ACCOUNT_DELETED,
                },
            },
        },
    },
};

export const upload_avatar = {
    operation: {
        summary: 'Upload avatar picture',
        description: `
    Upload avatar picture using binary image from the request body
    `,
    },

    responses: {
        success: {
            description: 'Avatar uploaded successfully',
            schema: {
                example: {
                    data: {
                        image_url:
                            'https://yapperdev.blob.core.windows.net/profile-images/3cda6108-8cb6-411b-9457-fbd8ffbf77ee-1761902534288-kurosensi.png',
                        image_name:
                            '3cda6108-8cb6-411b-9457-fbd8ffbf77ee-1761902534288-kurosensi.png',
                    },
                    count: 0,
                    message: SUCCESS_MESSAGES.AVATAR_UPLOADED,
                },
            },
        },
    },

    body: {
        description: 'Avatar image file',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Avatar image file (JPEG, PNG, etc.)',
                },
            },
            required: ['file'],
        },
    },
};

export const delete_avatar = {
    operation: {
        summary: 'Delete avatar picture',
        description: `
    Delete avatar picture using file url
    `,
    },

    responses: {
        success: {
            description: 'Avatar deleted successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.AVATAR_DELETED,
                },
            },
        },
    },
};

export const upload_cover = {
    operation: {
        summary: 'Upload cover picture',
        description: `
    Upload cover picture using binary image from the request body
    `,
    },

    responses: {
        success: {
            description: 'Cover uploaded successfully',
            schema: {
                example: {
                    data: {
                        image_url:
                            'https://yapperdev.blob.core.windows.net/profile-images/3cda6108-8cb6-411b-9457-fbd8ffbf77ee-1761902534288-kurosensi.png',
                        image_name:
                            '3cda6108-8cb6-411b-9457-fbd8ffbf77ee-1761902534288-kurosensi.png',
                    },
                    count: 0,
                    message: SUCCESS_MESSAGES.COVER_UPLOADED,
                },
            },
        },
    },

    body: {
        description: 'Cover image file',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Cover image file (JPEG, PNG, etc.)',
                },
            },
            required: ['file'],
        },
    },
};

export const delete_cover = {
    operation: {
        summary: 'Delete cover picture',
        description: `
    Delete cover picture using file url
    `,
    },

    responses: {
        success: {
            description: 'Cover uploaded successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.COVER_DELETED,
                },
            },
        },
    },
};

export const assign_interests = {
    operation: {
        summary: 'Assign interests',
        description: `
        Assign interests to current user
    `,
    },

    responses: {
        success: {
            description: 'Interests assigned successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.INTERESTS_ASSIGNED,
                },
            },
        },
    },
};

export const change_language = {
    operation: {
        summary: 'Change language',
        description: `
        Change current user's language
        Available languages: 'en' and 'ar'
    `,
    },

    responses: {
        success: {
            description: 'Language changed successfully',
            schema: {
                example: {
                    data: {
                        language: 'ar',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.LANGUAGE_CHANGED,
                },
            },
        },
    },
};

export const get_username_recommendations = {
    operation: {
        summary: 'Get username recommendations',
        description: `
        Get a list of username recommendations
    `,
    },

    responses: {
        success: {
            description: 'Username recommendations retrieved successfully',
            schema: {
                example: {
                    data: {
                        recommendations: ['alyaa242', 'alyaali242', 'alyaali'],
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.USERNAME_RECOMMENDATIONS_RETRIEVED,
                },
            },
        },
    },
};

export const get_user_relations = {
    operation: {
        summary: 'Get user relations',
        description: `
        Get blocked and muted counts of current user
    `,
    },

    responses: {
        success: {
            description: 'User relations counts retrieved successfully',
            schema: {
                example: {
                    data: {
                        blocked_count: 1,
                        muted_count: 0,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.USER_RELATIONS_RETRIEVED,
                },
            },
        },
    },
};
