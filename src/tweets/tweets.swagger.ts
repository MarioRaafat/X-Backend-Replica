import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { UpdateTweetWithQuoteDTO } from './dto/update-tweet-with-quote.dto';

const UUID_EXAMPLE = '550e8400-e29b-41d4-a716-446655440000';

export const create_tweet_swagger = {
    operation: {
        summary: 'Create a new tweet',
        description:
            'Creates a new tweet with optional images and videos. User ID is extracted from the authenticated user.\n\n' +
            '**Response Structure:**\n' +
            '- `type`: Always "tweet" for regular tweets\n' +
            '- `parent_tweet_id`: Not included for regular tweets (only for replies, quotes, reposts)\n' +
            '- `conversation_id`: Not included for regular tweets (only for replies)',
    },

    body: {
        type: CreateTweetDTO,
    },

    responses: {
        created: {
            description: 'Tweet created successfully',
            schema: {
                example: {
                    data: {
                        tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                        type: 'tweet',
                        content: 'This is my first tweet!',
                        images: [
                            'https://example.com/image1.jpg',
                            'https://example.com/image2.jpg',
                        ],
                        videos: ['https://example.com/video1.mp4'],
                        likes_count: 0,
                        reposts_count: 0,
                        views_count: 0,
                        quotes_count: 0,
                        replies_count: 0,
                        is_liked: false,
                        is_reposted: false,
                        created_at: '2025-10-31T12:00:00.000Z',
                        updated_at: '2025-10-31T12:00:00.000Z',
                        user: {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'johndoe',
                            name: 'John Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    },
                    count: 1,
                    message: 'Tweet created successfully',
                },
            },
        },
    },
};

export const get_all_tweets_swagger = {
    operation: {
        summary: 'Get all tweets with cursor pagination',
        description:
            'Retrieves tweets with cursor-based pagination. Optionally filter by user_id to get tweets from a specific user.\n\n' +
            '**When filtering by user_id:**\n' +
            '- Returns both original tweets by the user AND tweets they reposted\n' +
            '- Each repost appears as a separate entry with `reposted_by` field containing repost_id, user id, and name\n' +
            '- Reposts are sorted by their repost timestamp (when they were reposted), not the original tweet date\n' +
            '- The tweet content shows the ORIGINAL author, `reposted_by` shows WHO reposted it and WHEN\n\n' +
            '**Cursor Pagination:**\n' +
            '1. First request: GET /tweets?limit=20\n' +
            '2. Response includes `next_cursor` with format: "timestamp_prefixed_id"\n' +
            '   - For original tweets: "2025-10-31T12:00:00.000Z_tweet_550e8400..."\n' +
            '   - For reposts: "2025-10-31T12:00:00.000Z_repost_650e8400..."\n' +
            '3. Next page: GET /tweets?cursor={next_cursor}&limit=20\n' +
            '4. Repeat until `has_more` is false\n' +
            '**Note:** The cursor includes a type prefix (tweet_ or repost_) to uniquely identify each entry,\n' +
            'ensuring stable pagination even when tweets and reposts have the same timestamp.\n\n' +
            '**Response fields:**\n' +
            '- `data`: Array of tweets and reposts sorted by their respective timestamps\n' +
            '- `count`: Total count of all tweets (including reposts when user_id filter is used)\n' +
            '- `next_cursor`: Pass this to the cursor parameter for the next page (null if no more pages)\n' +
            '- `has_more`: Boolean indicating if more tweets are available\n\n' +
            '**Tweet Types in Response:**\n' +
            '- Regular tweets: `type="tweet"` - no parent_tweet_id or conversation_id\n' +
            '- Replies: `type="reply"` - includes both parent_tweet_id and conversation_id\n' +
            '- Quotes: `type="quote"` - includes parent_tweet_id only\n' +
            '- Reposts: `type="repost"` - includes parent_tweet_id only\n\n' +
            '**Repost Field (reposted_by):**\n' +
            '- Only present when this tweet appears because someone reposted it\n' +
            '- `repost_id`: UUID of the repost record (maintained for cursor-based pagination)\n' +
            '- `id`: User ID who reposted the tweet\n' +
            '- `name`: Display name of the user who reposted\n' +
            '- `reposted_at`: Timestamp when the tweet was reposted (matches the cursor sort order)\n' +
            '- Note: `created_at`/`updated_at` show ORIGINAL tweet dates, `reposted_at` shows WHEN it was shared\n' +
            '- The main `user` field always shows the ORIGINAL tweet author\n' +
            '- To unrepost: Use `DELETE /tweets/:tweet_id/repost` (not the repost_id)',
    },

    queries: {
        user_id: {
            name: 'user_id',
            required: false,
            type: String,
            description: 'Filter tweets by user ID (UUID format)',
            example: UUID_EXAMPLE,
        },
        cursor: {
            name: 'cursor',
            required: false,
            type: String,
            description:
                'Cursor for pagination. Format: "timestamp_prefixed_id" where prefix is "tweet_" or "repost_". Use next_cursor from previous response exactly as provided.',
            example: '2025-10-23T12:00:00.000Z_tweet_550e8400-e29b-41d4-a716-446655440000',
        },
        limit: {
            name: 'limit',
            required: false,
            type: Number,
            description: 'Number of tweets to return (default: 20)',
            example: 20,
        },
    },

    responses: {
        success: {
            description: 'Tweets retrieved successfully with pagination metadata',
            schema: {
                example: {
                    data: [
                        // Example 1: Regular tweet without repost
                        {
                            tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                            type: 'tweet',
                            content: 'This is my first tweet!',
                            parent_tweet_id: '4a85c7dd-1559-480c-80f4-5e8a03434b3b',
                            conversation_id: '87911054-0f61-452c-ad69-f896e45e82a8',
                            images: [
                                'https://example.com/image1.jpg',
                                'https://example.com/image2.jpg',
                            ],
                            videos: ['https://example.com/video1.mp4'],
                            likes_count: 42,
                            reposts_count: 15,
                            views_count: 1250,
                            quotes_count: 8,
                            replies_count: 23,
                            is_liked: false,
                            is_reposted: false,
                            created_at: '2025-10-31T12:00:00.000Z',
                            updated_at: '2025-10-31T12:00:00.000Z',
                            user: {
                                id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                                username: 'johndoe',
                                name: 'John Doe',
                                avatar_url:
                                    'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                                verified: true,
                            },
                        },
                        // Example 2: Reply tweet
                        {
                            tweet_id: '7a4ff9f3-fcb2-4583-b7ca-b7aa88339ae8',
                            type: 'reply',
                            parent_tweet_id: '4a85c7dd-1559-480c-80f4-5e8a03434b3b',
                            conversation_id: '87911054-0f61-452c-ad69-f896e45e82a8',
                            content: 'This is my reply tweet!',
                            images: ['https://example.com/image1.jpg'],
                            videos: [],
                            likes_count: 5,
                            reposts_count: 1,
                            views_count: 120,
                            quotes_count: 0,
                            replies_count: 2,
                            is_liked: true,
                            is_reposted: false,
                            created_at: '2025-10-31T05:04:29.187Z',
                            updated_at: '2025-10-31T05:04:29.187Z',
                            user: {
                                id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                                username: 'mreazi',
                                name: 'Don Eazi',
                                avatar_url:
                                    'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                                verified: true,
                            },
                        },
                        // Example 3: Reposted tweet (has reposted_by field)
                        // Note: 'user' shows ORIGINAL author, 'reposted_by' shows WHO reposted
                        {
                            tweet_id: 'a8b2c3d4-e5f6-4789-abcd-ef1234567890',
                            type: 'tweet',
                            content: 'Amazing content worth sharing!',
                            images: [],
                            videos: [],
                            likes_count: 150,
                            reposts_count: 45,
                            views_count: 5000,
                            quotes_count: 12,
                            replies_count: 30,
                            is_liked: false,
                            is_reposted: true,
                            created_at: '2025-10-30T14:30:00.000Z',
                            updated_at: '2025-10-30T14:30:00.000Z',
                            user: {
                                id: '98765432-abcd-ef12-3456-7890abcdef12',
                                username: 'original_author',
                                name: 'Original Author',
                                avatar_url:
                                    'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
                                verified: false,
                            },
                            reposted_by: {
                                repost_id: '650e8400-e29b-41d4-a716-446655440001',
                                id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                                name: 'John Doe',
                                reposted_at: '2025-10-31T08:15:30.000Z',
                            },
                        },
                    ],
                    count: 100,
                    next_cursor:
                        '2025-10-30T14:30:00.000Z_repost_650e8400-e29b-41d4-a716-446655440001',
                    has_more: true,
                    message: 'Tweets retrieved successfully',
                },
            },
        },
    },
};

export const get_tweet_by_id_swagger = {
    operation: {
        summary: 'Get a tweet by ID',
        description:
            'Retrieves a specific tweet by its unique identifier.\n\n' +
            '**Response Structure:**\n' +
            '- `type`: Can be "tweet", "reply", "quote", or "repost"\n' +
            '- `parent_tweet_id`: Optional - only present for replies, quotes, and reposts\n' +
            '- `conversation_id`: Optional - only present for replies',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        success: {
            description:
                'Tweet retrieved successfully. Example shows a regular tweet. For replies, parent_tweet_id and conversation_id will be included.',
            schema: {
                example: {
                    data: {
                        tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                        type: 'tweet',
                        parent_tweet_id: '4a85c7dd-1559-480c-80f4-5e8a03434b3b',
                        conversation_id: '87911054-0f61-452c-ad69-f896e45e82a8',
                        content: 'This is my first tweet!',
                        images: [
                            'https://example.com/image1.jpg',
                            'https://example.com/image2.jpg',
                        ],
                        videos: ['https://example.com/video1.mp4'],
                        likes_count: 42,
                        reposts_count: 15,
                        views_count: 1250,
                        quotes_count: 8,
                        replies_count: 23,
                        is_liked: true,
                        is_reposted: false,
                        created_at: '2025-10-31T12:00:00.000Z',
                        updated_at: '2025-10-31T12:00:00.000Z',
                        user: {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'johndoe',
                            name: 'John Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    },
                    count: 1,
                    message: 'Tweet retrieved successfully',
                },
            },
        },
        successReply: {
            description:
                'Reply tweet retrieved successfully. Note the presence of parent_tweet_id and conversation_id.',
            schema: {
                example: {
                    data: {
                        tweet_id: '7a4ff9f3-fcb2-4583-b7ca-b7aa88339ae8',
                        type: 'reply',
                        parent_tweet_id: '4a85c7dd-1559-480c-80f4-5e8a03434b3b',
                        conversation_id: '87911054-0f61-452c-ad69-f896e45e82a8',
                        content: 'This is a reply tweet!',
                        images: ['https://example.com/image1.jpg'],
                        videos: [],
                        likes_count: 5,
                        reposts_count: 1,
                        views_count: 120,
                        quotes_count: 0,
                        replies_count: 2,
                        is_liked: true,
                        is_reposted: false,
                        created_at: '2025-10-31T05:04:29.187Z',
                        updated_at: '2025-10-31T05:04:29.187Z',
                        user: {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'mreazi',
                            name: 'Don Eazi',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    },
                    count: 1,
                    message: 'Tweet retrieved successfully',
                },
            },
        },
    },
};

export const update_tweet_swagger = {
    operation: {
        summary: 'Update a tweet',
        description:
            'Updates an existing tweet. Only the tweet owner can update their tweet. Tweet ID is from URL param, user ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    body: {
        type: UpdateTweetDTO,
    },

    responses: {
        success: {
            description: 'Tweet updated successfully',
            schema: {
                example: {
                    data: {
                        tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                        type: 'tweet',
                        parent_tweet_id: '4a85c7dd-1559-480c-80f4-5e8a03434b3b',
                        conversation_id: '87911054-0f61-452c-ad69-f896e45e82a8',
                        content: 'This is my updated tweet content!',
                        images: ['https://example.com/image1.jpg'],
                        videos: [],
                        likes_count: 42,
                        reposts_count: 15,
                        views_count: 1250,
                        quotes_count: 8,
                        replies_count: 23,
                        is_liked: true,
                        is_reposted: false,
                        created_at: '2025-10-31T12:00:00.000Z',
                        updated_at: '2025-10-31T15:30:00.000Z',
                        user: {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'johndoe',
                            name: 'John Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    },
                    count: 1,
                    message: 'Tweet updated successfully',
                },
            },
        },
    },
};

export const delete_tweet_swagger = {
    operation: {
        summary: 'Delete a tweet',
        description:
            'Deletes a tweet. Only the tweet owner can delete their tweet. Tweet ID is from URL param, user ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        noContent: {
            description: 'Tweet deleted successfully',
            schema: {
                example: {
                    message: 'Tweet deleted successfully',
                },
            },
        },
    },
};

export const repost_tweet_swagger = {
    operation: {
        summary: 'Repost a tweet',
        description:
            'Creates a simple repost of an existing tweet without additional commentary. ' +
            'This shares the tweet to your followers timeline.\n\n' +
            '**How it works:**\n' +
            '1. Creates a repost entry linking you to the original tweet\n' +
            "2. Increments the original tweet's repost count\n" +
            "3. The reposted tweet appears in your followers' timelines with your attribution\n" +
            '4. A unique repost_id is generated for cursor-based pagination\n\n' +
            '**Important Constraints:**\n' +
            '- Each user can only repost a tweet **once** (enforced by database unique constraint)\n' +
            '- Attempting to repost the same tweet again will return a 400 Bad Request error\n' +
            '- You cannot repost your own tweets (if implemented in service layer)\n\n' +
            '**To remove a repost:** Use `DELETE /tweets/:id/repost`',
    },

    param: {
        name: 'id',
        type: String,
        description: 'The UUID of the original tweet to repost',
        example: UUID_EXAMPLE,
    },

    responses: {
        created: {
            description: 'Tweet reposted successfully. The repost entry has been created.',
            schema: {
                example: {
                    message: 'Tweet reposted successfully',
                },
            },
        },
    },
};

export const delete_repost_swagger = {
    operation: {
        summary: 'Delete a repost (unrepost a tweet)',
        description:
            'Removes your repost of a specific tweet. This is commonly called "unreposting" or "un-retweeting".\n\n' +
            '**How it works:**\n' +
            '1. Finds your repost entry for the specified tweet using (user_id, tweet_id)\n' +
            '2. Deletes the repost entry from the database\n' +
            "3. Decrements the original tweet's repost count by 1\n" +
            '4. The tweet no longer appears as reposted in your timeline\n\n' +
            '**Endpoint Pattern:**\n' +
            '- URL: `DELETE /tweets/:id/repost`\n' +
            '- `:id` is the **tweet_id** of the original tweet (not the repost_id)\n' +
            '- User ID is automatically extracted from the JWT token\n\n' +
            '**Database Design:**\n' +
            '- Uses composite unique constraint on (user_id, tweet_id)\n' +
            '- This ensures one user can only have one repost per tweet\n' +
            '- The repost_id is still maintained for cursor-based pagination in timelines\n\n' +
            '**Error Handling:**\n' +
            '- Returns 404 if you never reposted this tweet\n' +
            '- Returns 404 if the tweet does not exist\n' +
            '- Automatically handles authentication (401 if not logged in)',
    },

    param: {
        name: 'id',
        type: String,
        description:
            'The UUID of the tweet you want to unrepost (the original tweet ID, not the repost ID)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    },

    responses: {
        no_content: {
            description:
                'Repost deleted successfully. The tweet has been unreposted and its repost count decremented.',
        },
    },
};

export const quote_tweet_swagger = {
    operation: {
        summary: 'Quote a tweet',
        description:
            'Creates a repost with additional commentary (quote tweet). User ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Original tweet ID to quote (UUID format)',
        example: UUID_EXAMPLE,
    },

    body: {
        type: CreateTweetDTO,
    },

    responses: {
        created: {
            description: 'Quote tweet created successfully',
            schema: {
                example: {
                    data: {
                        tweet_id: '770e8400-e29b-41d4-a716-446655440002',
                        type: 'quote',
                        parent_tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                        content: 'Adding my thoughts to this great tweet!',
                        images: [],
                        videos: [],
                        likes_count: 0,
                        reposts_count: 0,
                        views_count: 0,
                        quotes_count: 0,
                        replies_count: 0,
                        is_liked: false,
                        is_reposted: false,
                        created_at: '2025-10-31T12:15:00.000Z',
                        updated_at: '2025-10-31T12:15:00.000Z',
                        user: {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'johndoe',
                            name: 'John Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    },
                    count: 1,
                    message: 'Quote tweet created successfully',
                },
            },
        },
    },
};

export const reply_to_tweet_swagger = {
    operation: {
        summary: 'Reply to a tweet',
        description:
            'Creates a reply to an existing tweet. The reply becomes part of a conversation thread.\n\n' +
            '**Conversation Threading:**\n' +
            '- Each reply gets a `conversation_id` that points to the root tweet of the thread\n' +
            '- `parent_tweet_id` points to the immediate tweet being replied to\n' +
            '- `type` field will be set to "reply"\n' +
            '- Supports multi-level nested replies (replies to replies)\n\n' +
            '**Example Flow:**\n' +
            '1. Tweet A (root) - conversation_id: null\n' +
            '2. Reply B to A - conversation_id: A, parent_tweet_id: A\n' +
            '3. Reply C to B - conversation_id: A, parent_tweet_id: B\n\n' +
            'User ID is extracted from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'UUID of the tweet to reply to',
        example: UUID_EXAMPLE,
    },

    body: {
        type: CreateTweetDTO,
    },

    responses: {
        created: {
            description: 'Reply created successfully',
            schema: {
                example: {
                    data: {
                        tweet_id: '7a4ff9f3-fcb2-4583-b7ca-b7aa88339ae8',
                        type: 'reply',
                        parent_tweet_id: '4a85c7dd-1559-480c-80f4-5e8a03434b3b',
                        conversation_id: '87911054-0f61-452c-ad69-f896e45e82a8',
                        content: 'Great point! I totally agree with this.',
                        images: ['https://example.com/image1.jpg'],
                        videos: [],
                        likes_count: 0,
                        reposts_count: 0,
                        views_count: 0,
                        quotes_count: 0,
                        replies_count: 0,
                        is_liked: false,
                        is_reposted: false,
                        created_at: '2025-10-31T05:04:29.187Z',
                        updated_at: '2025-10-31T05:04:29.187Z',
                        user: {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'mreazi',
                            name: 'Don Eazi',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    },
                    count: 1,
                    message: 'Reply created successfully',
                },
            },
        },
    },
};

export const like_tweet_swagger = {
    operation: {
        summary: 'Like a tweet',
        description:
            'Adds a like to a tweet. A user can only like a tweet once. User ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID to like (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        noContent: {
            description: 'Tweet liked successfully',
            schema: {
                example: {
                    message: 'Tweet liked successfully',
                },
            },
        },
    },
};

export const unlike_tweet_swagger = {
    operation: {
        summary: 'Unlike a tweet',
        description: 'Removes a like from a tweet. User ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID to unlike (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        noContent: {
            description: 'Tweet unliked successfully',
            schema: {
                example: {
                    message: 'Tweet unliked successfully',
                },
            },
        },
    },
};

export const get_tweet_likes_swagger = {
    operation: {
        summary: 'Get users who liked a tweet (Owner only)',
        description:
            'Retrieves all users who have liked a specific tweet with cursor-based pagination.\n\n' +
            '**Access Restriction:**\n' +
            '- Only the tweet owner can view who liked their tweet\n' +
            '- Other users can only see the like count (num_likes) in the tweet object\n\n' +
            '**Pagination Flow:**\n' +
            '1. First request: GET /tweets/:id/likes?limit=20\n' +
            '2. Response includes `next_cursor` (user_id of last user)\n' +
            '3. Next page: GET /tweets/:id/likes?cursor={next_cursor}&limit=20\n' +
            '4. Repeat until `has_more` is false\n\n' +
            '**Response fields:**\n' +
            '- `data`: Array of users who liked the tweet\n' +
            '- `count`: Total number of likes on this tweet\n' +
            '- `next_cursor`: User ID to use for next page (null if no more pages)\n' +
            '- `has_more`: Boolean indicating if more likes are available',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    queries: {
        cursor: {
            name: 'cursor',
            required: false,
            type: String,
            description: 'Cursor for pagination (user_id). Use next_cursor from previous response.',
            example: '550e8400-e29b-41d4-a716-446655440000',
        },
        limit: {
            name: 'limit',
            required: false,
            type: Number,
            description: 'Number of users to return (default: 20, max: 100)',
            example: 20,
        },
    },

    responses: {
        success: {
            description: 'Tweet likes retrieved successfully with pagination metadata',
            schema: {
                example: {
                    data: [
                        {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'johndoe',
                            name: 'John Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                        {
                            id: '26945dc1-7853-46db-93b9-3f4201cfb77f',
                            username: 'janedoe',
                            name: 'Jane Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: false,
                        },
                        {
                            id: '36945dc1-7853-46db-93b9-3f4201cfb780',
                            username: 'mreazi',
                            name: 'Don Eazi',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    ],
                    count: 150,
                    next_cursor: '36945dc1-7853-46db-93b9-3f4201cfb780',
                    has_more: true,
                    message: 'Tweet likes retrieved successfully',
                },
            },
        },
    },
};

export const update_quote_tweet_swagger = {
    operation: {
        summary: 'Update a quote tweet',
        description:
            'Updates an existing quote tweet. Only the quote tweet owner can update it. Quote tweet ID is from URL param, user ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Quote Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    body: {
        type: UpdateTweetWithQuoteDTO,
    },

    responses: {
        success: {
            description: 'Quote tweet updated successfully',
            schema: {
                example: {
                    message: 'Quote tweet updated successfully',
                },
            },
        },
    },
};

export const upload_image_swagger = {
    operation: {
        summary: 'Upload an image',
        description:
            'Uploads a single image file. Maximum size: 5MB. Supported formats: JPEG, PNG, GIF, WebP. User ID is extracted from JWT token.',
    },

    consumes: 'multipart/form-data',

    body: {
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to upload (max 5MB)',
                },
            },
        },
    },

    responses: {
        created: {
            description: 'Image uploaded successfully',
            schema: {
                example: {
                    data: {
                        url: 'https://your-cdn.com/uploads/1234567890-vacation-photo.jpg',
                        filename: 'vacation-photo.jpg',
                        size: 2048576,
                        mime_type: 'image/jpeg',
                    },
                    count: 1,
                    message: 'Image uploaded successfully',
                },
            },
        },
    },
};

export const upload_video_swagger = {
    operation: {
        summary: 'Upload a video',
        description:
            'Uploads a single video file. Maximum size: 50MB. Supported formats: MP4, MOV, AVI, WebM. User ID is extracted from JWT token.',
    },

    consumes: 'multipart/form-data',

    body: {
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Video file to upload (max 50MB)',
                },
            },
        },
    },

    responses: {
        created: {
            description: 'Video uploaded successfully',
            schema: {
                example: {
                    data: {
                        url: 'https://your-cdn.com/uploads/1234567890-travel-video.mp4',
                        filename: 'travel-video.mp4',
                        size: 25165824,
                        mime_type: 'video/mp4',
                    },
                    count: 1,
                    message: 'Video uploaded successfully',
                },
            },
        },
    },
};

export const track_tweet_view_swagger = {
    operation: {
        summary: 'Track a tweet view',
        description:
            'Increments the view count for a specific tweet. This should be called when a user views a tweet. Tweet ID is from URL param, user ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        success: {
            description: 'Tweet view tracked successfully',
            schema: {
                example: {
                    data: {
                        success: true,
                    },
                    count: 1,
                    message: 'Tweet view tracked successfully',
                },
            },
        },
    },
};

export const get_tweet_reposts_swagger = {
    operation: {
        summary: 'Get users who reposted a tweet',
        description: `Retrieves a paginated list of users who reposted the specified tweet.
        
**Access Control:**
- Available to all authenticated users
- Anyone can see who reposted any public tweet

**Important Notes:**
- Each user can only repost a tweet once (enforced by unique constraint)
- The list shows unique users who have reposted this tweet
- Users are sorted by when they reposted (most recent first)

**Pagination:**
- Uses cursor-based pagination with user_id
- Returns up to 100 users per request (default: 20)
- Use next_cursor from response to fetch next page

**Response Structure:**
All responses are wrapped in the standard format:
\`\`\`json
{
  "data": {
    "data": [...],      // Array of users who reposted
    "count": 150,       // Total number of unique users who reposted
    "next_cursor": "user-id",  // Cursor for next page
    "has_more": true    // Whether more results exist
  },
  "count": 1,
  "message": "Users who reposted the tweet retrieved successfully"
}
\`\`\``,
    },

    queries: {
        cursor: {
            name: 'cursor',
            required: false,
            type: String,
            description: 'Cursor for pagination (user_id). Use next_cursor from previous response.',
            example: '550e8400-e29b-41d4-a716-446655440000',
        },
        limit: {
            name: 'limit',
            required: false,
            type: Number,
            description: 'Number of users to return (default: 20, max: 100)',
            example: 20,
        },
    },

    responses: {
        success: {
            description: 'Tweet reposts retrieved successfully with pagination metadata',
            schema: {
                example: {
                    data: [
                        {
                            id: '16945dc1-7853-46db-93b9-3f4201cfb77e',
                            username: 'johndoe',
                            name: 'John Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                        {
                            id: '26945dc1-7853-46db-93b9-3f4201cfb77f',
                            username: 'janedoe',
                            name: 'Jane Doe',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: false,
                        },
                        {
                            id: '36945dc1-7853-46db-93b9-3f4201cfb780',
                            username: 'mreazi',
                            name: 'Don Eazi',
                            avatar_url:
                                'https://pbs.twimg.com/profile_images/1974533037804122112/YNWfB1cr_normal.jpg',
                            verified: true,
                        },
                    ],
                    count: 150,
                    next_cursor: '36945dc1-7853-46db-93b9-3f4201cfb780',
                    has_more: true,
                    message: 'Users who reposted the tweet retrieved successfully',
                },
            },
        },
    },
};

export const get_tweet_quotes_swagger = {
    operation: {
        summary: 'Get quote tweets for a tweet',
        description: `Retrieves a paginated list of quote tweets for the specified tweet.
        
**Access Control:**
- Available to all authenticated users
- Anyone can see quote tweets for any public tweet

**What are Quote Tweets:**
- Tweets that repost with additional commentary
- Each quote tweet is a full tweet object with its own content
- Shows the user's thoughts about the original tweet

**Pagination:**
- Uses cursor-based pagination with timestamp_tweetid format
- Returns up to 100 quotes per request (default: 20)
- Sorted by creation time (most recent first)
- Use next_cursor from response to fetch next page

**Response Structure:**
Returns full tweet objects for each quote tweet:
\`\`\`json
{
  "data": {
    "data": [...],           // Array of tweet objects
    "count": 45,             // Total number of quote tweets
    "next_cursor": "2025...", // Cursor for next page
    "has_more": true         // Whether more results exist
  },
  "message": "Quote tweets retrieved successfully"
}
\`\`\``,
    },

    param: {
        name: 'id',
        type: String,
        description: 'The UUID of the tweet to get quotes for',
        example: UUID_EXAMPLE,
    },

    queries: {
        cursor: {
            name: 'cursor',
            required: false,
            type: String,
            description:
                'Cursor for pagination (timestamp_tweetid format). Use next_cursor from previous response.',
            example: '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000',
        },
        limit: {
            name: 'limit',
            required: false,
            type: Number,
            description: 'Number of quote tweets to return (default: 20, max: 100)',
            example: 20,
        },
    },

    responses: {
        success: {
            description: 'Quote tweets retrieved successfully with pagination metadata',
            schema: {
                example: {
                    data: [
                        {
                            tweet_id: '770e8400-e29b-41d4-a716-446655440002',
                            type: 'quote',
                            parent_tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                            content: 'This is so true! Adding my thoughts here...',
                            images: [],
                            videos: [],
                            likes_count: 12,
                            reposts_count: 3,
                            views_count: 156,
                            quotes_count: 1,
                            replies_count: 4,
                            is_liked: false,
                            is_reposted: false,
                            created_at: '2025-10-31T14:30:00.000Z',
                            updated_at: '2025-10-31T14:30:00.000Z',
                            user: {
                                id: '26945dc1-7853-46db-93b9-3f4201cfb77e',
                                username: 'janedoe',
                                name: 'Jane Doe',
                                avatar_url:
                                    'https://pbs.twimg.com/profile_images/1974533037804122112/abc123_normal.jpg',
                                verified: false,
                            },
                        },
                    ],
                    count: 45,
                    next_cursor: '2025-10-31T14:30:00.000Z_770e8400-e29b-41d4-a716-446655440002',
                    has_more: true,
                },
            },
        },
    },
};
