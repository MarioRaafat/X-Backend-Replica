import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const get_users_by_ids = {
  operation: {
    summary: "Get users' data by their IDs",
    description: `
    Get a list of users' data using their IDs        
    `,
  },

  responses: {
    success: {
      description: 'Users retrieved successfully',
      schema: {
        example: {
          data: [
            {
              userId: 1,
              name: 'Alyaa Ali',
              username: 'Alyaali242',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: true,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
            {
              userId: 5,
              name: 'Amira Khalid',
              username: 'amira#222',
              bio: 'computer engineer',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: false,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
          ],
          count: 2,
          message: SUCCESS_MESSAGES.USERS_RETRIEVED,
        },
      },
    },
  },
};

export const get_users_by_username = {
  operation: {
    summary: "Get users' data by their usernames",
    description: `
    Get a list of users' data using their usernames        
    `,
  },

  responses: {
    success: {
      description: 'Users retrieved successfully',
      schema: {
        example: {
          data: [
            {
              userId: 1,
              name: 'Alyaa Ali',
              username: 'Alyaali242',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: true,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
            {
              userId: 5,
              name: 'Amira Khalid',
              username: 'amira#222',
              bio: 'computer engineer',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: false,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
          ],
          count: 2,
          message: SUCCESS_MESSAGES.USERS_RETRIEVED,
        },
      },
    },
  },
};

export const get_me = {
  operation: {
    summary: 'Get current user',
    description: `
    Get current user data     
    `,
  },

  responses: {
    success: {
      description: 'User retrieved successfully',
      schema: {
        example: {
          data: {
            userId: 1,
            name: 'Alyaa Ali',
            username: 'Alyaali242',
            bio: 'hi there!',
            profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
            coverImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
            followersCount: 5,
            followingCount: 15,
            country: 'Egypt',
            createdAt: '2025-10-30',
          },
          count: 1,
          message: SUCCESS_MESSAGES.USER_RETRIEVED,
        },
      },
    },
  },
};

export const get_user_by_id = {
  operation: {
    summary: 'Get user by id',
    description: `
    Get user data by id    
    `,
  },

  responses: {
    success: {
      description: 'User retrieved successfully',
      schema: {
        example: {
          data: {
            userId: 1,
            name: 'Alyaa Ali',
            username: 'Alyaali242',
            bio: 'hi there!',
            profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
            coverImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
            followersCount: 5,
            followingCount: 15,
            country: 'Egypt',
            createdAt: '2025-10-30',
            isFollower: true,
            isFollowing: false,
            isMuted: false,
            isBlocked: true,
            topMutualFollowers: [
              {
                name: 'Mario Raafat',
                profileImage: 'https://cdn.app.com/profiles/u877.jpg',
              },
              {
                name: 'Amira Khalid',
                profileImage: 'https://cdn.app.com/profiles/u877.jpg',
              },
            ],
            mutualFollowersCount: 5,
          },
          count: 1,
          message: SUCCESS_MESSAGES.USER_RETRIEVED,
        },
      },
    },
  },
};

export const get_user_by_username = {
  operation: {
    summary: 'Get user by username',
    description: `
    Get user data by username    
    `,
  },

  responses: {
    success: {
      description: 'User retrieved successfully',
      schema: {
        example: {
          data: {
            userId: 1,
            name: 'Alyaa Ali',
            username: 'Alyaali242',
            bio: 'hi there!',
            profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
            coverImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
            followersCount: 5,
            followingCount: 15,
            country: 'Egypt',
            createdAt: '2025-10-30',
            isFollower: true,
            isFollowing: false,
            isMuted: false,
            isBlocked: true,
            topMutualFollowers: [
              {
                name: 'Mario Raafat',
                profileImage: 'https://cdn.app.com/profiles/u877.jpg',
              },
              {
                name: 'Amira Khalid',
                profileImage: 'https://cdn.app.com/profiles/u877.jpg',
              },
            ],
            mutualFollowersCount: 5,
          },
          count: 1,
          message: SUCCESS_MESSAGES.USER_RETRIEVED,
        },
      },
    },
  },
};

export const get_followers = {
  operation: {
    summary: "Get user's followers",
    description: `
    Get user's list of followers by user ID     
    `,
  },

  responses: {
    success: {
      description: 'Followers retrieved successfully',
      schema: {
        example: {
          data: [
            {
              userId: 1,
              name: 'Alyaa Ali',
              username: 'Alyaali242',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: false,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
            {
              userId: 1,
              name: 'Amira Khalid',
              username: 'amira2342',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: true,
              isFollower: false,
              isMuted: true,
              isBlocked: true,
            },
          ],
          count: 1,
          message: SUCCESS_MESSAGES.FOLLOWERS_LIST_RETRIEVED,
        },
      },
    },
  },
};

export const remove_follower = {
  operation: {
    summary: 'Remove follower',
    description: `
    Remove a follower by ID     
    `,
  },

  responses: {
    success: {
      description: 'Follower removed successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.FOLLOWER_REMOVED,
        },
      },
    },
  },
};

export const get_following = {
  operation: {
    summary: "Get user's following list",
    description: `
    Get user's following list by ID   
    `,
  },

  responses: {
    success: {
      description: 'Following list retrieved successfully',
      schema: {
        example: {
          data: [
            {
              userId: 1,
              name: 'Alyaa Ali',
              username: 'Alyaali242',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: false,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
            {
              userId: 1,
              name: 'Amira Khalid',
              username: 'amira2342',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: true,
              isFollower: false,
              isMuted: true,
              isBlocked: true,
            },
          ],
          count: 1,
          message: SUCCESS_MESSAGES.FOLLOWING_LIST_RETRIEVED,
        },
      },
    },
  },
};

export const follow_user = {
  operation: {
    summary: 'Follow user',
    description: `
    Follow user by ID
    `,
  },

  responses: {
    success: {
      description: 'Followed user successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.FOLLOW_USER,
        },
      },
    },
  },
};

export const unfollow_user = {
  operation: {
    summary: 'Unfollow user',
    description: `
    Unfollow user by ID
    `,
  },

  responses: {
    success: {
      description: 'Unfollowed user successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.UNFOLLOW_USER,
        },
      },
    },
  },
};

export const get_muted = {
  operation: {
    summary: "Get user's muted list",
    description: `
    Get user's muted list by ID   
    `,
  },

  responses: {
    success: {
      description: 'Muted list retrieved successfully',
      schema: {
        example: {
          data: [
            {
              userId: 1,
              name: 'Alyaa Ali',
              username: 'Alyaali242',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: false,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
            {
              userId: 1,
              name: 'Amira Khalid',
              username: 'amira2342',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: true,
              isFollower: false,
              isMuted: true,
              isBlocked: true,
            },
          ],
          count: 1,
          message: SUCCESS_MESSAGES.MUTED_LIST_RETRIEVED,
        },
      },
    },
  },
};

export const mute_user = {
  operation: {
    summary: 'Mute user',
    description: `
    Mute user by ID
    `,
  },

  responses: {
    success: {
      description: 'Muted user successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.MUTE_USER,
        },
      },
    },
  },
};

export const unmute_user = {
  operation: {
    summary: 'Unmute user',
    description: `
    Unmute user by ID
    `,
  },

  responses: {
    success: {
      description: 'Unmuted user successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.UNMUTE_USER,
        },
      },
    },
  },
};

export const get_blocked = {
  operation: {
    summary: "Get user's blocked list",
    description: `
    Get user's blocked list by ID   
    `,
  },

  responses: {
    success: {
      description: 'Blocked list retrieved successfully',
      schema: {
        example: {
          data: [
            {
              userId: 1,
              name: 'Alyaa Ali',
              username: 'Alyaali242',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: false,
              isFollower: false,
              isMuted: false,
              isBlocked: true,
            },
            {
              userId: 1,
              name: 'Amira Khalid',
              username: 'amira2342',
              bio: 'hi there!',
              profileImgUrl: 'https://cdn.app.com/profiles/u877.jpg',
              isFollowing: true,
              isFollower: false,
              isMuted: true,
              isBlocked: true,
            },
          ],
          count: 1,
          message: SUCCESS_MESSAGES.BLOCKED_LIST_RETRIEVED,
        },
      },
    },
  },
};

export const block_user = {
  operation: {
    summary: 'Block user',
    description: `
    Block user by ID
    `,
  },

  responses: {
    success: {
      description: 'Blocked user successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.BLOCK_USER,
        },
      },
    },
  },
};

export const unblock_user = {
  operation: {
    summary: 'Unblock user',
    description: `
    Unblock user by ID
    `,
  },

  responses: {
    success: {
      description: 'Unblocked user successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.UNBLOCK_USER,
        },
      },
    },
  },
};

export const get_liked_posts = {
  operation: {
    summary: 'Get liked posts',
    description: `
    Get current user's liked posts
    `,
  },

  responses: {
    success: {
      description: 'Retrieved liked posts successfully',
      schema: {
        example: {
          data: [
            { postId: 1, content: 'blah blah' },
            { postId: 3, content: 'test test' },
          ], // Temporarily until post's data is known
          count: 1,
          message: SUCCESS_MESSAGES.LIKED_POSTS_RETRIEVED,
        },
      },
    },
  },
};

export const get_user_posts = {
  operation: {
    summary: "Get user's posts",
    description: `
    Get user's posts by user ID
    `,
  },

  responses: {
    success: {
      description: 'Retrieved posts successfully',
      schema: {
        example: {
          data: [
            { postId: 1, content: 'blah blah' },
            { postId: 3, content: 'test test' },
          ], // Temporarily until post's data is known
          count: 1,
          message: SUCCESS_MESSAGES.POSTS_RETRIEVED,
        },
      },
    },
  },
};

export const get_user_replies = {
  operation: {
    summary: "Get user's replies",
    description: `
    Get user's replies by user ID
    `,
  },

  responses: {
    success: {
      description: 'Retrieved replies successfully',
      schema: {
        example: {
          data: [
            { postId: 1, content: 'blah blah' },
            { postId: 3, content: 'test test' },
          ], // Temporarily until post's data is known
          count: 1,
          message: SUCCESS_MESSAGES.REPLIES_RETRIEVED,
        },
      },
    },
  },
};

export const get_user_media = {
  operation: {
    summary: "Get user's media",
    description: `
    Get user's media by user ID
    `,
  },

  responses: {
    success: {
      description: 'Retrieved media successfully',
      schema: {
        example: {
          data: [
            { postId: 1, content: 'blah blah' },
            { postId: 3, content: 'test test' },
          ], // Temporarily until post's data is known
          count: 1,
          message: SUCCESS_MESSAGES.MEDIA_RETRIEVED,
        },
      },
    },
  },
};

export const update_user = {
  operation: {
    summary: 'Update user profile',
    description: `
    Update current user profile
    `,
  },

  responses: {
    success: {
      description: 'Updated user successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.USER_UPDATED,
        },
      },
    },
  },
};

export const change_phone_number = {
  operation: {
    summary: 'Change phone number',
    description: `
    Change current user's phone number
    `,
  },

  responses: {
    success: {
      description: 'Phone number changed successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.PHONE_NUMBER_CHANGED,
        },
      },
    },
  },
};

export const deactivate_account = {
  operation: {
    summary: 'Deactivate account',
    description: `
    Deactivate current user's account
    `,
  },

  responses: {
    success: {
      description: 'Account deactivated successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.ACCOUNT_DEACTIVATED,
        },
      },
    },
  },
};

export const reactivate_account = {
  operation: {
    summary: 'Reactivate account',
    description: `
    Reactivate current user's account
    `,
  },

  responses: {
    success: {
      description: 'Account reactivated successfully',
      schema: {
        example: {
          data: {},
          count: 0,
          message: SUCCESS_MESSAGES.ACCOUNT_REACTIVATED,
        },
      },
    },
  },
};
