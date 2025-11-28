import { count } from 'console';
import { SUCCESS_MESSAGES } from 'src/constants/swagger-messages';

export const timeline_swagger = {
    for_you: {
        operation: {
            summary: 'Get For You timeline',
            description: `**Fetches personalized algorithmic timeline with recommended tweet
                   . We have 3 catogeries that appear on timeline** 

             1. **Normal Post:**  
                  A standalone post with no reference to another post.

             2.  **Quote Post:**  
                   A post that quotes another post.  
                  The quoted post is returned in the \`referenced_post\` field, containing its author and content.

             3. **Reply Post:**  
                   A post that replies to another post.  
                   The replied post is returned in the \`referenced_post\` field, containing all its data.
                   If the referenced post is also a reply, then it also has its own referenced post (nested).
                   
        Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.`,
        },
    },

    following: {
        operation: {
            summary: 'Get following timeline',
            description: ` **Fetches timeline from your followings tweets (Reverse chronological)
                   . We have 3 catogeries that appear on timeline** 

             1. **Normal Post:**  
                  A standalone post with no reference to another post.

             2.  **Quote Post:**  
                   A post that quotes another post.  
                  The quoted post is returned in the \`referenced_post\` field, containing its author and content.

             3. **Reply Post:**  
                   A post that replies to another post.  
                   The replied post is returned in the \`referenced_post\` field, containing all its data.
                   If the referenced post is also a reply, then it also has its own referenced post (nested).
               
         Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.  `,
        },
    },

    mentions: {
        operation: {
            summary: 'Get tweets mentioning a user',
            description: 'Fetches tweets that mention a specific user',
        },
    },

    trends: {
        operation: {
            summary: 'Get tweets in a trend',
            description: 'Fetches tweets in a given trend category',
        },
    },

    responses: {
        success: {
            description: 'Timeline retrieved successfully',
            schema: {
                example: {
                    data: {
                        data: [
                            {
                                tweet_id: 'c4858093-7fee-4a4c-b482-3be62f0efb93',
                                type: 'tweet',
                                content: 'This is my no media tweet!',
                                images: [],
                                videos: [],
                                user: {
                                    id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                                    username: 'alyaa2242',
                                    name: 'Alyaa Ali',
                                    avatar_url: 'https://example.com/images/profile.jpg',
                                    verified: false,
                                    bio: 'Software developer and tech enthusiast.',
                                    cover_url: 'https://example.com/images/cover.jpg',
                                    followers: 2,
                                    following: 2,
                                    is_following: true,
                                    is_follower: false,
                                },
                                parent_tweet: null,
                                conversation_tweet: null,
                                likes_count: 0,
                                reposts_count: 0,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 1,
                                is_liked: false,
                                is_reposted: false,
                                is_bookmarked: false,
                                reposted_by: null,
                                created_at: '2025-11-19T20:26:51.841Z',
                                updated_at: '2025-11-20T05:48:41.476Z',
                            },
                            {
                                tweet_id: 'a1ba7ee3-f290-41f3-acaa-b5369d656794',
                                type: 'repost',
                                content: 'This is my 5 tweet!',
                                images: [
                                    'https://example.com/image1.jpg',
                                    'https://example.com/image2.jpg',
                                ],
                                videos: ['https://example.com/video1.mp4'],
                                user: {
                                    id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                                    username: 'alyaa2242',
                                    name: 'Alyaa Ali',
                                    avatar_url: 'https://example.com/images/profile.jpg',
                                    verified: false,
                                    bio: 'Software developer and tech enthusiast.',
                                    cover_url: 'https://example.com/images/cover.jpg',
                                    followers: 2,
                                    following: 2,
                                    is_following: true,
                                    is_follower: false,
                                },
                                parent_tweet: null,
                                conversation_tweet: null,
                                likes_count: 1,
                                reposts_count: 1,
                                views_count: 0,
                                quotes_count: 1,
                                replies_count: 1,
                                is_liked: false,
                                is_reposted: false,
                                is_bookmarked: false,
                                reposted_by: {
                                    repost_id: 'a1ba7ee3-f290-41f3-acaa-b5369d656794',
                                    id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                                    name: 'Alyaa Ali',
                                    reposted_at: '2025-11-19T09:46:33.68702',
                                },
                                created_at: '2025-11-19T07:46:08.261Z',
                                updated_at: '2025-11-19T08:01:23.611Z',
                            },
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
                                    name: 'Alyaa Ali',
                                    avatar_url: 'https://example.com/images/profile.jpg',
                                    verified: false,
                                    bio: 'Software developer and tech enthusiast.',
                                    cover_url: 'https://example.com/images/cover.jpg',
                                    followers: 2,
                                    following: 2,
                                    is_following: true,
                                    is_follower: false,
                                },
                                parent_tweet: {
                                    tweet_id: 'eb512276-abcc-4d70-8c2c-ba8dca533472',
                                    type: 'tweet',
                                    content: 'This is my first tweet!',
                                    images: [
                                        'https://example.com/image1.jpg',
                                        'https://example.com/image2.jpg',
                                    ],
                                    videos: ['https://example.com/video1.mp4'],
                                    user: {
                                        id: '323926cd-4fdb-4880-85f5-a31aa983bc79',
                                        username: 'alyaa2242',
                                        name: 'Alyaa Ali',
                                        avatar_url: 'https://example.com/images/profile.jpg',
                                        verified: false,
                                        bio: 'Software developer and tech enthusiast.',
                                        cover_url: 'https://example.com/images/cover.jpg',
                                        followers: 2,
                                        following: 2,
                                        is_following: false,
                                        is_follower: false,
                                    },
                                    likes_count: 0,
                                    reposts_count: 0,
                                    views_count: 0,
                                    quotes_count: 1,
                                    replies_count: 0,
                                    is_bookmarked: false,
                                    created_at: '2025-11-19T09:45:41.889156',
                                },
                                conversation_tweet: null,
                                likes_count: 0,
                                reposts_count: 0,
                                views_count: 0,
                                quotes_count: 0,
                                replies_count: 0,
                                is_liked: false,
                                is_reposted: false,
                                is_bookmarked: false,
                                reposted_by: null,
                                created_at: '2025-11-19T11:47:37.206Z',
                                updated_at: '2025-11-19T11:47:37.206Z',
                            },
                            ///REPLIES ON TWEETS ---> ALL FEED REPLIES ARE NESTED FOR NOW///

                            {
                                tweet_id: '8d20dfcc-55a6-4d0d-b7a1-124de52661be',
                                type: 'reply',
                                content:
                                    'Amira replies to reply tweet to tweet with no media (second reply)',
                                images: [
                                    'https://example.com/image1.jpg',
                                    'https://example.com/image2.jpg',
                                ],
                                videos: ['https://example.com/video1.mp4'],
                                user: {
                                    id: 'c6be7f07-2f2f-4704-ba5b-617e2b15e46f',
                                    username: 'amira999',
                                    name: 'Amira Khalid',
                                    avatar_url: null,
                                    verified: false,
                                    bio: null,
                                    cover_url: null,
                                    followers: 0,
                                    following: 1,
                                    is_following: false,
                                    is_follower: false,
                                },
                                parent_tweet: {
                                    tweet_id: 'e2b15d31-a427-4d8c-8827-1555d41d92d3',
                                    type: 'reply',
                                    content: 'Amira replies to normal tweet with no media',
                                    images: [
                                        'https://example.com/image1.jpg',
                                        'https://example.com/image2.jpg',
                                    ],
                                    videos: ['https://example.com/video1.mp4'],
                                    user: {
                                        id: 'c6be7f07-2f2f-4704-ba5b-617e2b15e46f',
                                        username: 'amira999',
                                        name: 'Amira Khalid',
                                        avatar_url: null,
                                        verified: false,
                                        bio: null,
                                        cover_url: null,
                                        followers: 0,
                                        following: 1,
                                        is_following: false,
                                        is_follower: false,
                                    },
                                    likes_count: 0,
                                    reposts_count: 0,
                                    views_count: 0,
                                    quotes_count: 0,
                                    replies_count: 2,
                                    is_liked: false,
                                    is_reposted: false,
                                    is_bookmarked: false,
                                    created_at: '2025-11-20T07:48:41.476534',
                                },
                                conversation_tweet: {
                                    tweet_id: 'e2b15d31-a427-4d8c-8827-1555d41d92d3',
                                    type: 'reply',
                                    content: 'Amira replies to normal tweet with no media',
                                    images: [
                                        'https://example.com/image1.jpg',
                                        'https://example.com/image2.jpg',
                                    ],
                                    videos: ['https://example.com/video1.mp4'],
                                    user: {
                                        id: 'c6be7f07-2f2f-4704-ba5b-617e2b15e46f',
                                        username: 'amira999',
                                        name: 'Amira Khalid',
                                        avatar_url: null,
                                        verified: false,
                                        bio: null,
                                        cover_url: null,
                                        followers: 0,
                                        following: 1,
                                        is_following: false,
                                        is_follower: false,
                                    },
                                    likes_count: 0,
                                    reposts_count: 0,
                                    views_count: 0,
                                    quotes_count: 0,
                                    replies_count: 2,
                                    is_liked: false,
                                    is_reposted: false,
                                    is_bookmarked: false,
                                    created_at: '2025-11-20T07:48:41.476534',
                                },
                            },
                        ], // TODO: Uncomment after tweet implementation
                        pagination: {
                            next_cursor:
                                '2025-11-19T07:45:41.889Z_eb512276-abcc-4d70-8c2c-ba8dca533472',
                            has_more: false,
                        },
                    },

                    message: SUCCESS_MESSAGES.TIMELINE_RETRIEVED,
                    count: 4, //length of tweets array
                },
            },
        },

        mentions_success: {
            description: 'Mentions retrieved successfully',
            schema: {
                example: {
                    data: {
                        tweets: [], // TODO: Uncomment after tweet implementation
                        pagination: {
                            next_cursor: 'dHdlZXRfMTIzXzE3MDUzMjA2MDA=',
                            has_more: true,
                        },
                        timestamp: '2024-01-15T10:35:00Z',
                    },
                    message: SUCCESS_MESSAGES.MENTIONS_RETRIEVED,
                    count: 50, //length of tweets array
                },
            },
        },

        trends_success: {
            description: 'Trends retrieved successfully',
            schema: {
                example: {
                    data: {
                        trends: [
                            {
                                name: '#WorldCup2024',
                                query: 'WorldCup2024',
                                tweet_volume: 125000,
                                category: 'sports',
                            },
                            {
                                name: '#TechNews',
                                query: 'TechNews',
                                tweet_volume: 89000,
                                category: 'technology',
                            },
                        ],
                        timestamp: '2024-01-15T10:35:00Z',
                    },
                    message: SUCCESS_MESSAGES.TRENDS_RETRIEVED,
                    count: 20, //length of trends array
                },
            },
        },
    },

    api_query: {
        limit: {
            name: 'limit',
            required: false,
            type: Number,
            example: 20,
            description: 'Number of tweets to return (1-20)',
        },
        cursor: {
            name: 'cursor',
            required: false,
            type: String,
            example: 'dHdlZXRfMTIzXzE3MDUzMjA2MDA=',
            description: 'Cursor for pagination (load older tweets)',
        },

        since_id: {
            name: 'since_id',
            required: false,
            type: String,
            example: '1856019327451',
            description: 'Load tweets newer than this ID',
        },

        user_id: {
            name: 'user_id',
            required: true,
            type: String,
            example: 'user123456789',
            description: 'User ID to get mentions for',
        },

        category: {
            name: 'category',
            required: true,
            type: String,
            example: 'technology',
            description: 'Category of trends to retrieve (e.g., technology, sports, entertainment)',
        },
    },
};
