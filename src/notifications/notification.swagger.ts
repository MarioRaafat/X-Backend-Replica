export const get_user_notifications_swagger = {
    operation: {
        summary: 'Get user notifications',
        description: `
Retrieves all notifications for the authenticated user in reverse chronological order (newest first).

**Notification Types:**

1. **Follow Notification** (\`type: "follow"\`)
   - Triggered when someone follows you
   - Contains: \`followers\` (Array of User objects)
   - **Aggregation**: Multiple follows from the same person within 24 hours are aggregated into a single notification

2. **Like Notification** (\`type: "like"\`)
   - Triggered when someone likes your tweet
   - Contains: \`likers\` (Array of User objects), \`tweets\` (Array of Tweet objects)
   - **Aggregation by tweet**: When multiple people like the same tweet within 24 hours, all users are shown with that one tweet
   - **Aggregation by person**: When the same person likes multiple tweets within 24 hours, that person is shown with all liked tweets
   - **Note**: Aggregation prioritizes by tweet first, then by person. Both types do not mix in a single notification

3. **Reply Notification** (\`type: "reply"\`)
   - Triggered when someone replies to your tweet
   - Contains: \`replier\` (User object), \`reply_tweet\` (Tweet object), \`original_tweet\` (Tweet object), \`conversation_id\` (optional string)

4. **Repost Notification** (\`type: "repost"\`)
   - Triggered when someone reposts your tweet
   - Contains: \`reposters\` (Array of User objects), \`tweets\` (Array of Tweet objects)
   - **Aggregation by tweet**: When multiple people repost the same tweet within 24 hours, all users are shown with that one tweet
   - **Aggregation by person**: When the same person reposts multiple tweets within 24 hours, that person is shown with all reposted tweets
   - **Note**: Aggregation prioritizes by tweet first, then by person. Both types do not mix in a single notification

5. **Quote Notification** (\`type: "quote"\`)
   - Triggered when someone quotes your tweet
   - Contains: \`quoter\` (User object), \`quote_tweet\` (Tweet object with nested \`parent_tweet\`)

**Response Structure:**
The response contains an array of notification objects. Each notification has a \`type\` field that indicates its type, and the remaining fields depend on that type.

**Limits:**
- Maximum: 50 most recent notifications
- Order: Reverse chronological (newest first)
        `,
    },
    responses: {
        ok: {
            description: 'Successfully retrieved user notifications',
            schema: {
                type: 'object',
                properties: {
                    notifications: {
                        type: 'array',
                        description: 'Array of notification objects',
                        items: {
                            oneOf: [
                                {
                                    type: 'object',
                                    title: 'FollowNotification',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            enum: ['follow'],
                                            example: 'follow',
                                        },
                                        created_at: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2025-11-29T09:15:00.000Z',
                                            description:
                                                'Timestamp when the notification was created or last updated (aggregated)',
                                        },
                                        follower: {
                                            type: 'array',
                                            description:
                                                'Users who followed you (aggregated by person within 24 hours)',
                                            items: { type: 'object' },
                                        },
                                    },
                                },
                                {
                                    type: 'object',
                                    title: 'LikeNotification',
                                    properties: {
                                        type: { type: 'string', enum: ['like'], example: 'like' },
                                        created_at: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2025-11-29T10:30:00.000Z',
                                            description:
                                                'Timestamp when the notification was created or last updated (aggregated)',
                                        },
                                        liker: {
                                            type: 'array',
                                            description:
                                                'Users who liked your tweet(s) - may contain multiple people (aggregation by tweet) or one person (aggregation by person)',
                                            items: { type: 'object' },
                                        },
                                        tweets: {
                                            type: 'array',
                                            description:
                                                'The tweets that were liked - one tweet (aggregation by tweet) or multiple tweets (aggregation by person)',
                                            items: { type: 'object' },
                                        },
                                    },
                                },
                                {
                                    type: 'object',
                                    title: 'ReplyNotification',
                                    properties: {
                                        type: { type: 'string', enum: ['reply'], example: 'reply' },
                                        created_at: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2025-11-29T08:45:00.000Z',
                                        },
                                        replier: {
                                            type: 'object',
                                            description: 'User who replied to your tweet',
                                        },
                                        reply_tweet: {
                                            type: 'object',
                                            description: 'The reply tweet',
                                        },
                                        original_tweet: {
                                            type: 'object',
                                            description: 'Your original tweet that was replied to',
                                        },
                                        conversation_id: {
                                            type: 'string',
                                            nullable: true,
                                            example: '623e4567-e89b-12d3-a456-426614174007',
                                        },
                                    },
                                },
                                {
                                    type: 'object',
                                    title: 'RepostNotification',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            enum: ['repost'],
                                            example: 'repost',
                                        },
                                        created_at: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2025-11-29T08:00:00.000Z',
                                            description:
                                                'Timestamp when the notification was created or last updated (aggregated)',
                                        },
                                        reposter: {
                                            type: 'array',
                                            description:
                                                'Users who reposted your tweet(s) - may contain multiple people (aggregation by tweet) or one person (aggregation by person)',
                                            items: { type: 'object' },
                                        },
                                        tweets: {
                                            type: 'array',
                                            description:
                                                'The tweets that were reposted - one tweet (aggregation by tweet) or multiple tweets (aggregation by person)',
                                            items: { type: 'object' },
                                        },
                                    },
                                },
                                {
                                    type: 'object',
                                    title: 'QuoteNotification',
                                    properties: {
                                        type: { type: 'string', enum: ['quote'], example: 'quote' },
                                        created_at: {
                                            type: 'string',
                                            format: 'date-time',
                                            example: '2025-11-29T07:30:00.000Z',
                                        },
                                        quoter: {
                                            type: 'object',
                                            description: 'User who quoted your tweet',
                                        },
                                        quote_tweet: {
                                            type: 'object',
                                            description:
                                                'The quote tweet (new tweet with quoted content), includes parent_tweet nested inside',
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
                example: {
                    notifications: [
                        {
                            type: 'like',
                            created_at: '2025-11-29T10:30:00.000Z',
                            likers: [
                                {
                                    id: '123e4567-e89b-12d3-a456-426614174000',
                                    email: 'john.doe@example.com',
                                    name: 'John Doe',
                                    username: 'johndoe',
                                    avatar_url: 'https://example.com/avatar.jpg',
                                },
                            ],
                            tweets: [
                                {
                                    tweet_id: '123e4567-e89b-12d3-a456-426614174001',
                                    user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                                    type: 'original',
                                    content: 'Example tweet (aggregated notification)',
                                    images: [],
                                    videos: [],
                                    num_likes: 42,
                                    num_reposts: 15,
                                    num_replies: 8,
                                    num_quotes: 3,
                                    num_views: 0,
                                    num_bookmarks: 0,
                                    created_at: '2025-11-29T09:00:00.000Z',
                                    updated_at: '2025-11-29T09:00:00.000Z',
                                    deleted_at: null,
                                },
                            ],
                        },
                        {
                            type: 'follow',
                            created_at: '2025-11-29T09:15:00.000Z',
                            followers: [
                                {
                                    id: '223e4567-e89b-12d3-a456-426614174003',
                                    email: 'jane.smith@example.com',
                                    name: 'Jane Smith',
                                    username: 'janesmith',
                                    avatar_url: 'https://example.com/avatar2.jpg',
                                },
                            ],
                        },
                        {
                            type: 'reply',
                            created_at: '2025-11-29T08:45:00.000Z',
                            replier: {
                                id: '323e4567-e89b-12d3-a456-426614174004',
                                email: 'alice.j@example.com',
                                name: 'Alice Johnson',
                                username: 'alicej',
                                avatar_url: 'https://example.com/avatar3.jpg',
                            },
                            reply_tweet: {
                                tweet_id: '423e4567-e89b-12d3-a456-426614174005',
                                user_id: '323e4567-e89b-12d3-a456-426614174004',
                                type: 'reply',
                                content: 'Great point!',
                                images: [],
                                videos: [],
                                num_likes: 5,
                                num_reposts: 1,
                                num_replies: 0,
                                num_quotes: 0,
                                num_views: 0,
                                num_bookmarks: 0,
                                created_at: '2025-11-29T08:45:00.000Z',
                                updated_at: '2025-11-29T08:45:00.000Z',
                                deleted_at: null,
                            },
                            original_tweet: {
                                tweet_id: '523e4567-e89b-12d3-a456-426614174006',
                                user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                                type: 'original',
                                content: 'What do you think about this?',
                                images: [],
                                videos: [],
                                num_likes: 20,
                                num_reposts: 5,
                                num_replies: 3,
                                num_quotes: 1,
                                num_views: 0,
                                num_bookmarks: 0,
                                created_at: '2025-11-29T07:00:00.000Z',
                                updated_at: '2025-11-29T07:00:00.000Z',
                                deleted_at: null,
                            },
                            conversation_id: '623e4567-e89b-12d3-a456-426614174007',
                        },
                        {
                            type: 'repost',
                            created_at: '2025-11-29T08:00:00.000Z',
                            reposters: [
                                {
                                    id: '723e4567-e89b-12d3-a456-426614174008',
                                    email: 'bob.w@example.com',
                                    name: 'Bob Williams',
                                    username: 'bobw',
                                    avatar_url: 'https://example.com/avatar4.jpg',
                                },
                            ],
                            tweets: [
                                {
                                    tweet_id: '823e4567-e89b-12d3-a456-426614174009',
                                    user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                                    type: 'original',
                                    content: 'Example tweet (aggregated notification)',
                                    images: [],
                                    videos: [],
                                    num_likes: 100,
                                    num_reposts: 25,
                                    num_replies: 12,
                                    num_quotes: 5,
                                    num_views: 0,
                                    num_bookmarks: 0,
                                    created_at: '2025-11-28T10:00:00.000Z',
                                    updated_at: '2025-11-28T10:00:00.000Z',
                                    deleted_at: null,
                                },
                            ],
                        },
                        {
                            type: 'quote',
                            created_at: '2025-11-29T07:30:00.000Z',
                            quoter: {
                                id: '923e4567-e89b-12d3-a456-426614174010',
                                email: 'charlie.b@example.com',
                                name: 'Charlie Brown',
                                username: 'charlieb',
                                avatar_url: 'https://example.com/avatar5.jpg',
                            },
                            quote_tweet: {
                                tweet_id: 'a23e4567-e89b-12d3-a456-426614174011',
                                user_id: '923e4567-e89b-12d3-a456-426614174010',
                                type: 'quote',
                                content: 'This is exactly what I was thinking!',
                                images: [],
                                videos: [],
                                num_likes: 30,
                                num_reposts: 8,
                                num_replies: 4,
                                num_quotes: 2,
                                num_views: 0,
                                num_bookmarks: 0,
                                created_at: '2025-11-29T07:30:00.000Z',
                                updated_at: '2025-11-29T07:30:00.000Z',
                                deleted_at: null,
                                parent_tweet: {
                                    tweet_id: 'b23e4567-e89b-12d3-a456-426614174012',
                                    user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                                    type: 'original',
                                    content: 'Here are my thoughts on the topic...',
                                    images: [],
                                    videos: [],
                                    num_likes: 50,
                                    num_reposts: 10,
                                    num_replies: 8,
                                    num_quotes: 3,
                                    num_views: 0,
                                    num_bookmarks: 0,
                                    created_at: '2025-11-29T06:00:00.000Z',
                                    updated_at: '2025-11-29T06:00:00.000Z',
                                    deleted_at: null,
                                },
                            },
                        },
                    ],
                },
            },
        },
    },
};
