import { Tweet } from './entities/tweet.entity';
import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { UpdateTweetWithQuoteDTO } from './dto/update-tweet-with-quote.dto';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';

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
            type: Tweet,
        },
    },
};

export const get_all_tweets_swagger = {
    operation: {
        summary: 'Get all tweets',
        description: 'Retrieves all tweets with pagination support.',
    },

    queries: {
        page: {
            name: 'page',
            required: false,
            type: Number,
            description: 'Page number (default: 1)',
            example: 1,
        },
        limit: {
            name: 'limit',
            required: false,
            type: Number,
            description: 'Number of items per page (default: 20)',
            example: 20,
        },
    },

    responses: {
        success: {
            description: 'Tweets retrieved successfully',
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
            type: Tweet,
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
            type: Tweet,
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
            description: 'Tweet reposted successfully (no body returned)',
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
            description: 'Quote tweet created successfully (no body returned)',
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
        },
    },
};

export const unlike_tweet_swagger = {
    operation: {
        summary: 'Unlike a tweet',
        description:
            'Removes a like from a tweet. User ID is from JWT token.',
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
            type: Tweet,
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
            type: UploadMediaResponseDTO,
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
            type: UploadMediaResponseDTO,
        },
    },
};
