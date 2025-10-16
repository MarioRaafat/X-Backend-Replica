import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_suggestions_swagger = {
  operation: {
    summary: 'Get suggestions of a query',
    description: `
    Get relevant suggestions of queries and people for a give query        
    `,
  },

  responses: {
    success: {
      description: 'Email verified successfully',
      schema: {
        example: {
          data: {
            userId: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
          },
          count: 1,
          message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
        },
      },
    },
  },
};

export const get_history_swagger = {
  operation: {
    summary: 'Get search history',
    description: 'Retrieve the authenticated user\'s search history',
  },
  responses: {
    success: {
      description: 'Search history retrieved successfully',
      schema: {
        example: {
          data: [],
          count: 0,
          message: SUCCESS_MESSAGES.SEARCH_HISTORY_RETRIEVED,
        },
      },
    },
  },
};

export const delete_history_swagger = {
  operation: {
    summary: 'Delete all search history',
    description: 'Delete all search entries for the authenticated user',
  },
  responses: {
    success: {
      description: 'Search history cleared successfully',
      schema: {
        example: { message: SUCCESS_MESSAGES.SEARCH_HISTORY_CLEARED },
      },
    },
  },
};

export const delete_history_item_swagger = {
  operation: {
    summary: 'Delete a search history item',
    description: 'Delete single search history item by id',
  },
  responses: {
    success: {
      description: 'Search history item deleted successfully',
      schema: {
        example: { message: SUCCESS_MESSAGES.SEARCH_HISTORY_ITEM_DELETED },
      },
    },
  },
};

export const create_history_query_swagger = {
  operation: {
    summary: 'Save query to search history',
    description: 'Save a search query string to the user\'s history',
  },
  responses: {
    success: {
      description: 'Search query saved successfully',
      schema: { example: { message: SUCCESS_MESSAGES.SEARCH_HISTORY_QUERY_SAVED } },
    },
  },
};

export const create_history_people_swagger = {
  operation: {
    summary: 'Save people search to history',
    description: 'Save a people search (userId) to history',
  },
  responses: {
    success: {
      description: 'People search saved successfully',
      schema: { example: { message: SUCCESS_MESSAGES.SEARCH_HISTORY_PEOPLE_SAVED } },
    },
  },
};
