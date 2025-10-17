import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const search_latest_posts = {
  operation: {
    summary: 'Get latest posts for explore',
    description: 'Retrieve latest posts for explore or for-you feed',
  },
  responses: {
    success: {
      description: 'Latest posts retrieved successfully',
      schema: {
        example: {
          data: [],
          count: 0,
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
  responses: {
    success: {
      description: 'Trending items retrieved successfully',
      schema: {
        example: {
          data: [],
          count: 0,
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
      schema: {
        example: {
          data: [],
          count: 0,
          message: SUCCESS_MESSAGES.EXPLORE_WHO_TO_FOLLOW_RETRIEVED,
        },
      },
    },
  },
};
