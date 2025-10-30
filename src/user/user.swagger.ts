import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_users_by_ids = {
    operation: {
        summary: "Get users' data by their IDs",
        description: `
    Get a list of users' data using array of IDs  
    `,
    },

    responses: {
        success: {
            description: 'Users retrieved successfully',
            schema: {
                example: {
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            success: true,
                            user: {
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
    Get a list of users' data using array of usernames       
    `,
    },

    responses: {
        success: {
            description: 'Users retrieved successfully',
            schema: {
                example: {
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            success: true,
                            user: {
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
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Alyaa Ali',
                            username: 'Alyaali242',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: false,
                            is_follower: false,
                            is_muted: false,
                            is_blocked: true,
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Amira Khalid',
                            username: 'amira2342',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: true,
                            is_follower: false,
                            is_muted: true,
                            is_blocked: true,
                        },
                    ],
                    count: 1,
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
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Alyaa Ali',
                            username: 'Alyaali242',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: false,
                            is_follower: false,
                            is_muted: false,
                            is_blocked: true,
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Amira Khalid',
                            username: 'amira2342',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: true,
                            is_follower: false,
                            is_muted: true,
                            is_blocked: true,
                        },
                    ],
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
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Alyaa Ali',
                            username: 'Alyaali242',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: false,
                            is_follower: false,
                            is_muted: false,
                            is_blocked: true,
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Amira Khalid',
                            username: 'amira2342',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: true,
                            is_follower: false,
                            is_muted: true,
                            is_blocked: true,
                        },
                    ],
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
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Alyaa Ali',
                            username: 'Alyaali242',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: false,
                            is_follower: false,
                            is_muted: false,
                            is_blocked: true,
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'Amira Khalid',
                            username: 'amira2342',
                            bio: 'hi there!',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            is_following: true,
                            is_follower: false,
                            is_muted: true,
                            is_blocked: true,
                        },
                    ],
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

    Each returned post includes its author, content, engagement counts, and creation date.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A post that quotes another post.  
      The quoted post is returned in the \`referenced_post\` field, containing its author and content.

    - **Reply Post:**  
      A post that replies to one or more users.  
      The usernames being replied to are listed in the \`replying_to\` array,  
      
    Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.
    `,
    },

    responses: {
        success: {
            description: 'Retrieved liked posts successfully',
            schema: {
                example: {
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'post',
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'quote',
                            referenced_post: {
                                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                username: 'alyaa242',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                content: 'blah blah',
                                images_url: [
                                    'https://cdn.app.com/profiles/u877.jpg',
                                    'https://cdn.app.com/profiles/u877.jpg',
                                ],
                                videos_url: [
                                    'https://cdn.app.com/profiles/u877.jpg',
                                    'https://cdn.app.com/profiles/u877.jpg',
                                ],
                                date: '2023-03-12',
                            },
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'reply',
                            replying_to: ['amira#2424', 'mohamed998'],
                        },
                    ],
                    count: 3,
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

    Each returned post includes its author, content, engagement counts, and creation date.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Repost:**  
      A post that simply re-shares another post without adding any new content.  
      same data as normal post for the original post.

    - **Quote Post:**  
      A post that quotes another post.  
      The quoted post is returned in the \`referenced_post\` field, containing its author and content.

    Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.
    `,
    },

    responses: {
        success: {
            description: 'Retrieved posts successfully',
            schema: {
                example: {
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'post',
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'repost',
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'quote',
                            referenced_post: {
                                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                username: 'alyaa242',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                content: 'blah blah',
                                images_url: [
                                    'https://cdn.app.com/profiles/u877.jpg',
                                    'https://cdn.app.com/profiles/u877.jpg',
                                ],
                                videos_url: [
                                    'https://cdn.app.com/profiles/u877.jpg',
                                    'https://cdn.app.com/profiles/u877.jpg',
                                ],
                                date: '2023-03-12',
                            },
                        },
                    ],
                    count: 3,
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

    Each returned post includes its author, content, engagement counts, and creation date.

    A referenced post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A post that quotes another post.  
      The quoted post is returned in the \`referenced_post\` field, containing its author and content.

    - **Reply Post:**  
      A post that replies to another post.  
      The replied post is returned in the \`referenced_post\` field, containing all its data.
      If the referenced post is also a reply, then it also has its own referenced post (nested).

      
    Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.
    `,
    },

    responses: {
        success: {
            description: 'Retrieved replies successfully',
            schema: {
                example: {
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'reply',
                            reference_post: {
                                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                username: 'alyaa242',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                content: 'blah blah',
                                images_url: [
                                    'https://cdn.app.com/profiles/u877.jpg',
                                    'https://cdn.app.com/profiles/u877.jpg',
                                ],
                                videos_url: [
                                    'https://cdn.app.com/profiles/u877.jpg',
                                    'https://cdn.app.com/profiles/u877.jpg',
                                ],
                                date: '2023-03-12',
                                likes_count: 10,
                                replies_count: 5,
                                reposts_count: 2,
                                views: 5,
                                reposted_by_me: true,
                                type: 'reply',
                                referenced_post: {
                                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                    username: 'alyaa242',
                                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                                    post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                    content: 'blah blah',
                                    images_url: [
                                        'https://cdn.app.com/profiles/u877.jpg',
                                        'https://cdn.app.com/profiles/u877.jpg',
                                    ],
                                    videos_url: [
                                        'https://cdn.app.com/profiles/u877.jpg',
                                        'https://cdn.app.com/profiles/u877.jpg',
                                    ],
                                    date: '2023-03-12',
                                    likes_count: 10,
                                    replies_count: 5,
                                    reposts_count: 2,
                                    views: 5,
                                    reposted_by_me: true,
                                    type: 'post',
                                },
                            },
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

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A post that quotes another post.  
      The quoted post is returned in the \`referenced_post\` field, containing its author and content.

    - **Reply Post:**  
      A post that replies to one or more users.  
      The usernames being replied to are listed in the \`replying_to\` array,  
      
    Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.    `,
    },

    responses: {
        success: {
            description: 'Retrieved media successfully',
            schema: {
                example: {
                    data: [
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'post',
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'quote',
                            referenced_post: {
                                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                username: 'alyaa242',
                                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                content: 'blah blah',
                                images_url: [
                                    'https://cdn.app.com/profiles/u877.jpg',
                                    'https://cdn.app.com/profiles/u877.jpg',
                                ],
                                date: '2023-03-12',
                            },
                        },
                        {
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            username: 'alyaa242',
                            avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                            post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'blah blah',
                            images_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            videos_url: [
                                'https://cdn.app.com/profiles/u877.jpg',
                                'https://cdn.app.com/profiles/u877.jpg',
                            ],
                            date: '2023-03-12',
                            likes_count: 10,
                            replies_count: 5,
                            reposts_count: 2,
                            views: 5,
                            reposted_by_me: true,
                            type: 'reply',
                            replying_to: ['amira#2424', 'mohamed998'],
                        },
                    ],
                    count: 3,
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
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.USER_UPDATED,
                },
            },
        },
    },
};

export const change_phone_number = {
    operation: {
        summary: 'Change phone number',
        description: `
    Change current user's phone number
    `,
    },

    responses: {
        success: {
            description: 'Phone number changed successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.PHONE_NUMBER_CHANGED,
                },
            },
        },
    },
};

export const deactivate_account = {
    operation: {
        summary: 'Deactivate account',
        description: `
    Deactivate current user's account
    `,
    },

    responses: {
        success: {
            description: 'Account deactivated successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.ACCOUNT_DEACTIVATED,
                },
            },
        },
    },
};

export const reactivate_account = {
    operation: {
        summary: 'Reactivate account',
        description: `
    Reactivate current user's account
    `,
    },

    responses: {
        success: {
            description: 'Account reactivated successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.ACCOUNT_REACTIVATED,
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
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.AVATAR_UPLOADED,
                },
            },
        },
    },

    body: {
        description: 'Avatar image file',
        type: 'multipart/form-data',
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
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.COVER_UPLOADED,
                },
            },
        },
    },

    body: {
        description: 'Avatar image file',
        type: 'multipart/form-data',
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
