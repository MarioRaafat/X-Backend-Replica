import { SUCCESS_MESSAGES } from '../constants/swagger-messages';
import { Tweet } from '../tweets/entities/tweet.entity';
import { User } from '../user/entities/user.entity';

export const search_latest_posts = {
    operation: {
        summary: 'Get latest posts for explore',
        description: 'Retrieve latest posts for explore or for-you feed',
    },
    queries: {
        category: {
            name: 'category',
            required: false,
            description: 'Filter posts by category',
            enum: ['sports', 'music', 'news', 'entertainment'],
        },
    },
    responses: {
        success: {
            description: 'Latest posts retrieved successfully',
            type: Tweet,
            schema: {
                example: {
                    data: [
                        {
                            tweet_id: '550e8400-e29b-41d4-a716-446655440000',
                            user_id: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
                            content: 'Example tweet content',
                            images: [],
                            videos: [],
                            num_likes: 0,
                            num_reposts: 0,
                            num_views: 0,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            user: {
                                id: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
                                name: 'John Doe',
                                username: 'johndoe',
                                avatar_url: 'https://cdn.app.com/profiles/u123.jpg',
                            },
                        },
                    ],
                    count: 1,
                    message: SUCCESS_MESSAGES.EXPLORE_FOR_YOU_POSTS_RETRIEVED,
                },
            },
        },
    },
};

export const trending_swagger = {
    operation: {
        summary: 'Get trending items',
        description: 'Retrieve trending items by category and country',
    },
    queries: {
        category: {
            name: 'category',
            required: false,
            description: 'Trending category filter',
            enum: ['none', 'sports', 'entertainment'],
        },
        country: {
            name: 'country',
            required: false,
            description: 'Country code filter',
        },
    },
    responses: {
        success: {
            description: 'Trending items retrieved successfully',
            schema: {
                example: {
                    data: [
                        { text: 'Topic A', posts_count: 123, reference_id: 'topic-a' },
                        { text: 'Topic B', posts_count: 45, reference_id: 'topic-b' },
                    ],
                    count: 2,
                    message: SUCCESS_MESSAGES.EXPLORE_TRENDING_RETRIEVED,
                },
            },
        },
    },
};

export const who_to_follow_swagger = {
    operation: {
        summary: 'Get who to follow suggestions',
        description: 'Retrieve recommended users to follow',
    },
    responses: {
        success: {
            description: 'Who to follow suggestions retrieved',
            type: User,
            schema: {
                example: {
                    data: [
                        {
                            id: 12,
                            name: 'John Doe',
                            username: 'johndoe',
                            bio: 'Software developer',
                            avatar_url: 'https://example.com/avatar.jpg',
                            verified: false,
                        },
                    ],
                    count: 1,
                    message: SUCCESS_MESSAGES.EXPLORE_WHO_TO_FOLLOW_RETRIEVED,
                },
            },
        },
    },
};
