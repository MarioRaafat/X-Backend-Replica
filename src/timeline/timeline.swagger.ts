import { count } from 'console';
import { SUCCESS_MESSAGES } from 'src/constants/swagger-messages';

export const timeline_swagger = {
    for_you: {
        operation: {
            summary: 'Get For You timeline',
            description: 'Fetches personalized algorithmic timeline with recommended tweets',
        },
    },

    following: {
        operation: {
            summary: 'Get following timeline',
            description: 'Fetches  timeline from accounts you follow',
        },
    },

    responses: {
        success: {
            description: 'Timeline retrieved successfully',
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

                    message: SUCCESS_MESSAGES.TIMELINE_RETRIEVED,
                    count: 100, //length of tweets array
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
    },
};
