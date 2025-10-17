import { SUCCESS_MESSAGES } from '../constants/swagger-messages';
import { Tweet } from '../tweets/entities/tweet.entity';

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
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
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
            { text: 'Topic A', postsCount: 123, referenceId: 'topic-a' },
            { text: 'Topic B', postsCount: 45, referenceId: 'topic-b' },
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
      schema: { example: { data: [], count: 0, message: SUCCESS_MESSAGES.EXPLORE_WHO_TO_FOLLOW_RETRIEVED } },
    },
  },
};
