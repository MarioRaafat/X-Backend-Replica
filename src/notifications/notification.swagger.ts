export const get_user_notifications_swagger = {
    operation: {
        summary: 'Get user notifications',
        description: `
Retrieves all notifications for the authenticated user in reverse chronological order (newest first).

**Notification Types:**

1. **Follow Notification** (\`type: "follow"\`)
   - Triggered when someone follows you
   - Contains: \`follower\` (User object)

2. **Like Notification** (\`type: "like"\`)
   - Triggered when someone likes your tweet
   - Contains: \`liker\` (User object), \`tweet\` (Tweet object)

3. **Reply Notification** (\`type: "reply"\`)
   - Triggered when someone replies to your tweet
   - Contains: \`replier\` (User object), \`reply_tweet\` (Tweet object), \`original_tweet\` (Tweet object), \`conversation_id\` (optional string)

4. **Repost Notification** (\`type: "repost"\`)
   - Triggered when someone reposts your tweet
   - Contains: \`reposter\` (User object), \`tweet\` (Tweet object)

5. **Quote Notification** (\`type: "quote"\`)
   - Triggered when someone quotes your tweet
   - Contains: \`quoter\` (User object), \`quote_tweet\` (Tweet object), \`parent_tweet\` (Tweet object)

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
                                        },
                                        follower: {
                                            type: 'object',
                                            description: 'User who followed you',
                                            properties: {
                                                id: {
                                                    type: 'string',
                                                    example: '223e4567-e89b-12d3-a456-426614174003',
                                                },
                                                name: { type: 'string', example: 'Jane Smith' },
                                                username: { type: 'string', example: 'janesmith' },
                                                avatar_url: {
                                                    type: 'string',
                                                    example: 'https://example.com/avatar2.jpg',
                                                },
                                                email: {
                                                    type: 'string',
                                                    example: 'jane.smith@example.com',
                                                },
                                                verified: { type: 'boolean', example: false },
                                            },
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
                                        },
                                        liker: {
                                            type: 'object',
                                            description: 'User who liked your tweet',
                                        },
                                        tweet: {
                                            type: 'object',
                                            description: 'The tweet that was liked',
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
                                        },
                                        reposter: {
                                            type: 'object',
                                            description: 'User who reposted your tweet',
                                        },
                                        tweet: {
                                            type: 'object',
                                            description: 'The tweet that was reposted',
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
                                                'The quote tweet (new tweet with quoted content)',
                                        },
                                        parent_tweet: {
                                            type: 'object',
                                            description: 'Your original tweet that was quoted',
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
                            liker: {
                                id: '123e4567-e89b-12d3-a456-426614174000',
                                name: 'John Doe',
                                username: 'johndoe',
                                avatar_url: 'https://example.com/avatar.jpg',
                                email: 'john.doe@example.com',
                                verified: true,
                            },
                            tweet: {
                                tweet_id: '123e4567-e89b-12d3-a456-426614174001',
                                content: 'This is an example tweet!',
                                num_likes: 42,
                                num_reposts: 15,
                                num_replies: 8,
                                num_quotes: 3,
                                created_at: '2025-11-29T09:00:00.000Z',
                            },
                        },
                        {
                            type: 'follow',
                            created_at: '2025-11-29T09:15:00.000Z',
                            follower: {
                                id: '223e4567-e89b-12d3-a456-426614174003',
                                name: 'Jane Smith',
                                username: 'janesmith',
                                avatar_url: 'https://example.com/avatar2.jpg',
                                email: 'jane.smith@example.com',
                                verified: false,
                            },
                        },
                        {
                            type: 'reply',
                            created_at: '2025-11-29T08:45:00.000Z',
                            replier: {
                                id: '323e4567-e89b-12d3-a456-426614174004',
                                name: 'Alice Johnson',
                                username: 'alicej',
                                avatar_url: 'https://example.com/avatar3.jpg',
                                email: 'alice.j@example.com',
                                verified: true,
                            },
                            reply_tweet: {
                                tweet_id: '423e4567-e89b-12d3-a456-426614174005',
                                content: 'Great point!',
                                num_likes: 5,
                                num_reposts: 1,
                                num_replies: 0,
                                num_quotes: 0,
                                created_at: '2025-11-29T08:45:00.000Z',
                            },
                            original_tweet: {
                                tweet_id: '523e4567-e89b-12d3-a456-426614174006',
                                content: 'What do you think about this?',
                                num_likes: 20,
                                num_reposts: 5,
                                num_replies: 3,
                                num_quotes: 1,
                                created_at: '2025-11-29T07:00:00.000Z',
                            },
                            conversation_id: '623e4567-e89b-12d3-a456-426614174007',
                        },
                        {
                            type: 'repost',
                            created_at: '2025-11-29T08:00:00.000Z',
                            reposter: {
                                id: '723e4567-e89b-12d3-a456-426614174008',
                                name: 'Bob Williams',
                                username: 'bobw',
                                avatar_url: 'https://example.com/avatar4.jpg',
                                email: 'bob.w@example.com',
                                verified: false,
                            },
                            tweet: {
                                tweet_id: '823e4567-e89b-12d3-a456-426614174009',
                                content: 'Check out this amazing content!',
                                num_likes: 100,
                                num_reposts: 25,
                                num_replies: 12,
                                num_quotes: 5,
                                created_at: '2025-11-28T10:00:00.000Z',
                            },
                        },
                        {
                            type: 'quote',
                            created_at: '2025-11-29T07:30:00.000Z',
                            quoter: {
                                id: '923e4567-e89b-12d3-a456-426614174010',
                                name: 'Charlie Brown',
                                username: 'charlieb',
                                avatar_url: 'https://example.com/avatar5.jpg',
                                email: 'charlie.b@example.com',
                                verified: true,
                            },
                            quote_tweet: {
                                tweet_id: 'a23e4567-e89b-12d3-a456-426614174011',
                                content: 'This is exactly what I was thinking!',
                                num_likes: 30,
                                num_reposts: 8,
                                num_replies: 4,
                                num_quotes: 2,
                                created_at: '2025-11-29T07:30:00.000Z',
                            },
                            parent_tweet: {
                                tweet_id: 'b23e4567-e89b-12d3-a456-426614174012',
                                content: 'Here are my thoughts on the topic...',
                                num_likes: 50,
                                num_reposts: 10,
                                num_replies: 8,
                                num_quotes: 3,
                                created_at: '2025-11-29T06:00:00.000Z',
                            },
                        },
                    ],
                },
            },
        },
    },
};
