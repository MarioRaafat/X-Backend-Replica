import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { UpdateTweetWithQuoteDTO } from './dto/update-tweet-with-quote.dto';
import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

const UUID_EXAMPLE = '550e8400-e29b-41d4-a716-446655440000';

export const create_tweet_swagger = {
    operation: {
        summary: 'Create a new tweet',
        description:
            'Creates a new tweet with optional images and videos. User ID is extracted from the authenticated user.',
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
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        content: 'This is my first tweet!',
                        images: ['https://cdn.app.com/tweets/image1.jpg'],
                        videos: ['https://cdn.app.com/tweets/video1.mp4'],
                        num_likes: 0,
                        num_reposts: 0,
                        num_views: 0,
                        created_at: '2025-10-23T12:00:00Z',
                        updated_at: '2025-10-23T12:00:00Z',
                        user: {
                            id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'John Doe',
                            username: 'johndoe',
                            avatar_url: 'https://cdn.app.com/profiles/u123.jpg',
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.TWEET_CREATED,
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
            '**Pagination Flow:**\n' +
            '1. First request: GET /tweets?limit=20\n' +
            '2. Response includes `next_cursor` (format: "timestamp_tweetId")\n' +
            '3. Next page: GET /tweets?cursor={next_cursor}&limit=20\n' +
            '4. Repeat until `has_more` is false\n\n' +
            '**Response fields:**\n' +
            '- `data`: Array of tweets\n' +
            '- `count`: Total count of all tweets\n' +
            '- `next_cursor`: Pass this to the cursor parameter for the next page (null if no more pages)\n' +
            '- `has_more`: Boolean indicating if more tweets are available',
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
                'Cursor for pagination. Format: timestamp_tweetId. Use next_cursor from previous response.',
            example: '2025-10-23T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000',
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
                        {
                            tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                            user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            content: 'This is my first tweet!',
                            images: ['https://cdn.app.com/tweets/image1.jpg'],
                            videos: [],
                            num_likes: 42,
                            num_reposts: 15,
                            num_views: 1250,
                            created_at: '2025-10-23T12:00:00Z',
                            updated_at: '2025-10-23T12:00:00Z',
                            user: {
                                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                                name: 'John Doe',
                                username: 'johndoe',
                                avatar_url: 'https://cdn.app.com/profiles/u123.jpg',
                            },
                        },
                    ],
                    count: 100,
                    next_cursor: '2025-10-23T11:59:00.000Z_550e8400-e29b-41d4-a716-446655440001',
                    has_more: true,
                    message: SUCCESS_MESSAGES.TWEETS_RETRIEVED,
                },
            },
        },
    },
};

export const get_tweet_by_id_swagger = {
    operation: {
        summary: 'Get a tweet by ID',
        description: 'Retrieves a specific tweet by its unique identifier.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        success: {
            description: 'Tweet retrieved successfully',
            schema: {
                example: {
                    data: {
                        tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        content: 'This is my first tweet!',
                        images: [
                            'https://cdn.app.com/tweets/image1.jpg',
                            'https://cdn.app.com/tweets/image2.jpg',
                        ],
                        videos: ['https://cdn.app.com/tweets/video1.mp4'],
                        num_likes: 42,
                        num_reposts: 15,
                        num_views: 1250,
                        created_at: '2025-10-23T12:00:00Z',
                        updated_at: '2025-10-23T12:00:00Z',
                        user: {
                            id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'John Doe',
                            username: 'johndoe',
                            avatar_url: 'https://cdn.app.com/profiles/u123.jpg',
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.TWEET_RETRIEVED,
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
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        content: 'This is my updated tweet content!',
                        images: ['https://cdn.app.com/tweets/image1.jpg'],
                        videos: [],
                        num_likes: 42,
                        num_reposts: 15,
                        num_views: 1250,
                        created_at: '2025-10-23T12:00:00Z',
                        updated_at: '2025-10-23T15:30:00Z',
                        user: {
                            id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                            name: 'John Doe',
                            username: 'johndoe',
                            avatar_url: 'https://cdn.app.com/profiles/u123.jpg',
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.TWEET_UPDATED,
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
                    data: undefined,
                    count: 0,
                    message: SUCCESS_MESSAGES.TWEET_DELETED,
                },
            },
        },
    },
};

export const repost_tweet_swagger = {
    operation: {
        summary: 'Repost a tweet',
        description:
            'Creates a simple repost of an existing tweet without additional commentary. User ID is from JWT token.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Original tweet ID to repost (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        created: {
            description: 'Tweet reposted successfully',
            schema: {
                example: {
                    data: undefined,
                    count: 0,
                    message: SUCCESS_MESSAGES.TWEET_REPOSTED,
                },
            },
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
                    data: undefined,
                    count: 0,
                    message: SUCCESS_MESSAGES.TWEET_QUOTED,
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
                    data: undefined,
                    count: 0,
                    message: SUCCESS_MESSAGES.TWEET_LIKED,
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
                    data: undefined,
                    count: 0,
                    message: SUCCESS_MESSAGES.TWEET_UNLIKED,
                },
            },
        },
    },
};

export const get_tweet_likes_swagger = {
    operation: {
        summary: 'Get tweet likes',
        description:
            'Retrieves all users who have liked a specific tweet, including the total count.',
    },

    param: {
        name: 'id',
        type: String,
        description: 'Tweet ID (UUID format)',
        example: UUID_EXAMPLE,
    },

    responses: {
        success: {
            description: 'Tweet likes retrieved successfully',
            schema: {
                example: {
                    data: undefined,
                    count: 0,
                    message: SUCCESS_MESSAGES.TWEET_LIKES_RETRIEVED,
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
                    data: undefined,
                    count: 0,
                    message: SUCCESS_MESSAGES.QUOTE_TWEET_UPDATED,
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
                    message: SUCCESS_MESSAGES.TWEET_VIEW_TRACKED,
                },
            },
        },
    },
};
