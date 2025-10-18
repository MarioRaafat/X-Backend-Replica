import { count } from 'console';
import { SUCCESS_MESSAGES } from 'src/constants/swagger-messages';

export const timeline_swagger = {
  for_you: {
    operation: {
      summary: 'Get For You timeline',
      description:
        'Fetches personalized algorithmic timeline with recommended tweets',
    },
  },

  following: {
    operation: {
      summary: 'Get following timeline',
      description: 'Fetches  timeline from accounts you follow',
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
                category: 'sports'
              },
              {
                name: '#TechNews',
                query: 'TechNews',
                tweet_volume: 89000,
                category: 'technology'
              }
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
