import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_suggestions_swagger = {
  operation: {
    summary: 'Get suggestions of a query',
    description: `
    Get relevant suggestions of queries and people for a given query
    `,
  },

  responses: {
    success: {
      description: 'Search suggestions retrieved successfully',
      schema: {
        example: {
          data: {
            suggested_queries: [
              { query: 'alyaa', isTrending: true },
              { query: 'alia', isTrending: true },
              { query: 'ali', isTrending: true },
            ],
            suggested_users: [
              {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                is_following: true,
                follows_me: false,
              },
              {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alia Mohamed',
                username: 'alyaa#222',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                is_following: false,
                follows_me: false,
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

  responses: {
    success: {
      description: 'User search results retrieved successfully',
      schema: {
        example: {
          data: {
            users: [
              {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Amira Khalid',
                username: 'Amirakhalid9',
                bio: 'computer engineering student',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                is_following: true,
                follows_me: false,
              },
              {
                user_id: 5,
                name: 'Amira Mohamed',
                username: 'amira#222',
                bio: 'computer engineer',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                is_following: false,
                follows_me: false,
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
    Retrieve posts result of a search query.

    Each returned post includes its author, content, engagement counts, and creation date.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A post that quotes another post.  
      The quoted post is returned in the \`referenced_post\` field, containing its author and content.

    - **Reply Post:**  
      A post that replies to one or more users.  
      The usernames being replied to are listed in the \`replying_to\` array,  
      
    Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.
    `,
  },

  responses: {
    success: {
      description: 'Posts search results retrieved successfully',
      schema: {
        example: {
          data: [
            {
              user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              username: 'alyaa242',
              avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
              post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              content: 'blah blah',
              media: [
                'https://cdn.app.com/profiles/u877.jpg',
                'https://cdn.app.com/profiles/u877.jpg',
              ],
              date: '2023-03-12',
              likes_count: 10,
              replies_count: 5,
              reposts_count: 2,
              views: 5,
              is_reposted: true,
              type: 'post',
            },
            {
              user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              username: 'alyaa242',
              avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
              post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              content: 'blah blah',
              media: [
                'https://cdn.app.com/profiles/u877.jpg',
                'https://cdn.app.com/profiles/u877.jpg',
              ],
              date: '2023-03-12',
              likes_count: 10,
              replies_count: 5,
              reposts_count: 2,
              views: 5,
              is_reposted: true,
              type: 'quote',
              referenced_post: {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'alyaa242',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'blah blah',
                media: [
                  'https://cdn.app.com/profiles/u877.jpg',
                  'https://cdn.app.com/profiles/u877.jpg',
                ],
                date: '2023-03-12',
              },
            },
            {
              user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              username: 'alyaa242',
              avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
              post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              content: 'blah blah',
              media: [
                'https://cdn.app.com/profiles/u877.jpg',
                'https://cdn.app.com/profiles/u877.jpg',
              ],
              date: '2023-03-12',
              likes_count: 10,
              replies_count: 5,
              reposts_count: 2,
              views: 5,
              is_reposted: true,
              type: 'reply',
              replying_to: ['amira#2424', 'mohamed998'],
            },
          ],
          count: 3,
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
  Retrieve a list of latest posts.

    Each returned post includes its author, content, engagement counts, and creation date.

    A post can be one of the following types:

    - **Normal Post:**  
      A standalone post with no reference to another post.

    - **Quote Post:**  
      A post that quotes another post.  
      The quoted post is returned in the \`referenced_post\` field, containing its author and content.

    - **Reply Post:**  
      A post that replies to one or more users.  
      The usernames being replied to are listed in the \`replying_to\` array,  
      
    Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.    `,
  },

  responses: {
    success: {
      description: 'Latest posts search results retrieved successfully',
      schema: {
        example: {
          data: [
            {
              user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              username: 'alyaa242',
              avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
              post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              content: 'blah blah',
              media: [
                'https://cdn.app.com/profiles/u877.jpg',
                'https://cdn.app.com/profiles/u877.jpg',
              ],
              date: '2023-03-12',
              likes_count: 10,
              replies_count: 5,
              reposts_count: 2,
              views: 5,
              is_reposted: true,
              type: 'post',
            },
            {
              user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              username: 'alyaa242',
              avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
              post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              content: 'blah blah',
              media: [
                'https://cdn.app.com/profiles/u877.jpg',
                'https://cdn.app.com/profiles/u877.jpg',
              ],
              date: '2023-03-12',
              likes_count: 10,
              replies_count: 5,
              reposts_count: 2,
              views: 5,
              is_reposted: true,
              type: 'quote',
              referenced_post: {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'alyaa242',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'blah blah',
                media: [
                  'https://cdn.app.com/profiles/u877.jpg',
                  'https://cdn.app.com/profiles/u877.jpg',
                ],
                date: '2023-03-12',
              },
            },
            {
              user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              username: 'alyaa242',
              avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
              post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
              content: 'blah blah',
              media: [
                'https://cdn.app.com/profiles/u877.jpg',
                'https://cdn.app.com/profiles/u877.jpg',
              ],
              date: '2023-03-12',
              likes_count: 10,
              replies_count: 5,
              reposts_count: 2,
              views: 5,
              is_reposted: true,
              type: 'reply',
              replying_to: ['amira#2424', 'mohamed998'],
            },
          ],
          count: 3,
          message: SUCCESS_MESSAGES.SEARCH_LATEST_POSTS_RETRIEVED,
        },
      },
    },
  },
};
