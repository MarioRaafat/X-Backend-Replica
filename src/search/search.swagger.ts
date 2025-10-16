import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_suggestions_swagger = {
  operation: {
    summary: 'Get suggestions of a query',
    description: `
    Get relevant suggestions of queries and people for a given query
    `,
  },

  api_query: {
    name: 'query',
    type: String,
    required: true,
    description: 'The query to search for',
    example: 'cat',
  },

  responses: {
    success: {
      description: 'Search suggestions retrieved successfully',
      schema: {
        example: {
          data: {
            suggestedQueries: [
              { query: 'alyaa', isTrending: true },
              { query: 'alia', isTrending: true },
              { query: 'ali', isTrending: true },
            ],
            suggestedUsers: [
              {
                userId: 1,
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
                isFollowing: true,
                followsMe: false,
              },
              {
                userId: 5,
                name: 'Alia Mohamed',
                username: 'alyaa#222',
                profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
                isFollowing: false,
                followsMe: false,
              },
            ],
          },
          count: 2,
          message: SUCCESS_MESSAGES.SUGGESTIONS_RETRIEVED,
        },
      },
    },
  },
};

export const search_users_swagger = {
  operation: {
    summary: 'Search users',
    description: `
    Get users search results
    `,
  },

  api_query: {
    name: 'query',
    type: String,
    required: true,
    description: 'The query to search for',
    example: 'cat',
  },

  responses: {
    success: {
      description: 'User search results retrieved successfully',
      schema: {
        example: {
          data: {
            users: [
              {
                userId: 1,
                name: 'Amira Khalid',
                username: 'Amirakhalid9',
                bio: 'computer engineering student',
                profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
                isFollowing: true,
                followsMe: false,
              },
              {
                userId: 5,
                name: 'Amira Mohamed',
                username: 'amira#222',
                bio: 'computer engineer',
                profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
                isFollowing: false,
                followsMe: false,
              },
            ],
          },
          count: 1,
          message: SUCCESS_MESSAGES.SEARCH_USERS_RETRIEVED,
        },
      },
    },
  },
};

export const search_posts = {
  operation: {
    summary: 'Search posts',
    description: `
    Get posts search results
    `,
  },

  responses: {
    success: {
      description: 'Posts search results retrieved successfully',
      schema: {
        example: {
          data: {
            yapIds: [1, 3, 5],
          },
          count: 1,
          message: SUCCESS_MESSAGES.SEARCH_POSTS_RETRIEVED,
        },
      },
    },
  },
};

export const search_latest_posts = {
  operation: {
    summary: 'Search latest posts',
    description: `
    Get latest posts search results
    `,
  },

  api_query: {
    name: 'query',
    type: String,
    required: true,
    description: 'The query to search for',
    example: 'cat',
  },

  responses: {
    success: {
      description: 'Latest posts search results retrieved successfully',
      schema: {
        example: {
          data: {
            yapIds: [1, 3, 5],
          },
          count: 1,
          message: SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED,
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
