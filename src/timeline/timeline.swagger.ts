import { count } from 'console';
import { SUCCESS_MESSAGES } from 'src/constants/swagger-messages';

export const timeline_swagger = {
  for_you: {
    operation: {
      summary: 'Get For You timeline',
      description: `**Fetches personalized algorithmic timeline with recommended tweet
                   . We have 3 catogeries that appear on timeline** 

             1. **Normal Post:**  
                  A standalone post with no reference to another post.

             2.  **Quote Post:**  
                   A post that quotes another post.  
                  The quoted post is returned in the \`referenced_post\` field, containing its author and content.

             3. **Reply Post:**  
                   A post that replies to another post.  
                   The replied post is returned in the \`referenced_post\` field, containing all its data.
                   If the referenced post is also a reply, then it also has its own referenced post (nested).
                   
        Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.`,
    },
  },

  following: {
    operation: {
      summary: 'Get following timeline',
      description: ` **Fetches timeline from your followings tweets (Reverse chronological)
                   . We have 3 catogeries that appear on timeline** 

             1. **Normal Post:**  
                  A standalone post with no reference to another post.

             2.  **Quote Post:**  
                   A post that quotes another post.  
                  The quoted post is returned in the \`referenced_post\` field, containing its author and content.

             3. **Reply Post:**  
                   A post that replies to another post.  
                   The replied post is returned in the \`referenced_post\` field, containing all its data.
                   If the referenced post is also a reply, then it also has its own referenced post (nested).
               
         Each post also includes engagement metrics such as \`likes_count\`, \`reposts_count\`, and \`viewsCount\`.  `,
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
            tweets: [
              {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'amira',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Post content',
                images: [
                  'https://cdn.app.com/profiles/u877.jpg',
                  'https://cdn.app.com/profiles/u878.png',
                ],
                videos: [
                  'https://cdn.app.com/videos/v101.mp4',
                  'https://cdn.app.com/videos/v102.webm',
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
                username: 'amira',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Post content',
                images: [
                  'https://cdn.app.com/profiles/u877.jpg',
                  'https://cdn.app.com/profiles/u878.png',
                ],
                videos: [
                  'https://cdn.app.com/videos/v101.mp4',
                  'https://cdn.app.com/videos/v102.webm',
                ],
                date: '2023-03-12',
                likes_count: 10,
                replies_count: 5,
                reposts_count: 2,
                views: 5,
                is_reposted: true,
                type: 'repost',
              },
              {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'esraa',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Hello X',
                images: [
                  'https://cdn.app.com/profiles/u877.jpg',
                  'https://cdn.app.com/profiles/u878.png',
                ],
                videos: [
                  'https://cdn.app.com/videos/v101.mp4',
                  'https://cdn.app.com/videos/v102.webm',
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
                  username: 'hagar',
                  avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                  post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                  content: 'Hello Yapper',
                  images: [
                    'https://cdn.app.com/profiles/u877.jpg',
                    'https://cdn.app.com/profiles/u878.png',
                  ],
                  videos: [
                    'https://cdn.app.com/videos/v101.mp4',
                    'https://cdn.app.com/videos/v102.webm',
                  ],
                  date: '2023-03-12',
                },
              },
              ///REPLIES ON TWEETS ---> ALL FEED REPLIES ARE NESTED FOR NOW///

              {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username: 'alyaa242',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'blah blah',
                images: [
                  'https://cdn.app.com/profiles/u877.jpg',
                  'https://cdn.app.com/profiles/u878.png',
                ],
                videos: [
                  'https://cdn.app.com/videos/v101.mp4',
                  'https://cdn.app.com/videos/v102.webm',
                ],
                date: '2023-03-12',
                likes_count: 10,
                replies_count: 5,
                reposts_count: 2,
                views: 5,
                is_reposted: true,
                type: 'reply',
                reference_post: {
                  user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                  username: 'alyaa242',
                  avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                  post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                  content: 'blah blah',
                  images: [
                    'https://cdn.app.com/profiles/u877.jpg',
                    'https://cdn.app.com/profiles/u878.png',
                  ],
                  videos: [
                    'https://cdn.app.com/videos/v101.mp4',
                    'https://cdn.app.com/videos/v102.webm',
                  ],
                  date: '2023-03-12',
                  likes_count: 10,
                  replies_count: 5,
                  reposts_count: 2,
                  views: 5,
                  is_reposted: true,
                  type: 'reply',
                  referenced_post: {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    username: 'alyaa242',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    post_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    content: 'blah blah',
                    images: [
                      'https://cdn.app.com/profiles/u877.jpg',
                      'https://cdn.app.com/profiles/u878.png',
                    ],
                    videos: [
                      'https://cdn.app.com/videos/v101.mp4',
                      'https://cdn.app.com/videos/v102.webm',
                    ],
                    date: '2023-03-12',
                    likes_count: 10,
                    replies_count: 5,
                    reposts_count: 2,
                    views: 5,
                    is_reposted: true,
                    type: 'post',
                  },
                },
              },
            ], // TODO: Uncomment after tweet implementation
            pagination: {
              next_cursor: 'dHdlZXRfMTIzXzE3MDUzMjA2MDA=',
              has_more: true,
            },
            timestamp: '2024-01-15T10:35:00Z',
          },

          message: SUCCESS_MESSAGES.TIMELINE_RETRIEVED,
          count: 4, //length of tweets array
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
