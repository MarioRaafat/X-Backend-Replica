export const ERROR_MESSAGES = {
    // auth
    WRONG_PASSWORD: 'Wrong password',
    PASSWORD_CONFIRMATION_MISMATCH: 'Confirmation password must match password',
    NEW_PASSWORD_SAME_AS_OLD: 'New password must be different from the old password',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    EMAIL_NOT_VERIFIED: 'Email not verified yet. Please check your inbox',
    SOCIAL_LOGIN_REQUIRED:
        'User registered with social login. Please use social login to access your account',
    CAPTCHA_VERIFICATION_FAILED: 'CAPTCHA verification failed. Please try again',
    ACCOUNT_ALREADY_VERIFIED: 'Account was already verified',
    SIGNUP_SESSION_NOT_FOUND:
        'Signup session not found or expired. Please start registration again',
    SIGNUP_SESSION_ALREADY_EXISTS:
        'Signup session already exists. Please verify your email or start over',
    EMAIL_NOT_FOUND: 'Email not found',
    PHONE_NUMBER_NOT_FOUND: 'Phone number not found',
    USERNAME_NOT_FOUND: 'Username not found',

    // OAuth completion
    INVALID_OAUTH_SESSION_TOKEN: 'Invalid OAuth session token',
    USERNAME_ALREADY_TAKEN: 'Username is already taken',
    USER_NOT_FOUND_OAUTH_COMPLETION_REQUIRED: 'User not found, OAuth completion required',

    // user
    USER_NOT_FOUND: 'User not found',
    USER_NOT_FOUND_OR_VERIFIED: 'User not found or already verified',

    // communication
    FAILED_TO_SEND_OTP_EMAIL: 'Failed to send OTP email',
    OTP_REQUEST_WAIT: 'Please wait a minute before requesting a new code',

    // database
    FAILED_TO_SAVE_IN_DB: 'Failed to save the data to database',
    FAILED_TO_UPDATE_IN_DB: 'Failed to update the data in database',

    // file upload
    FILE_TOO_LARGE: 'File size exceeds the maximum limit',
    INVALID_FILE_TYPE: 'Invalid file type. Only images and videos are allowed',
    NO_FILE_PROVIDED: 'No file provided',

    // links & Tokens
    INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
    INVALID_OR_EXPIRED_LINK: 'Invalid or expired link',
    NO_REFRESH_TOKEN_PROVIDED: 'No refresh token provided',

    // server
    INTERNAL_SERVER_ERROR: 'Internal server error',

    // chat
    CHAT_NOT_FOUND: 'Chat not found',
    MESSAGE_NOT_FOUND: 'Message not found',
    UNAUTHORIZED_ACCESS_TO_CHAT: 'Unauthorized access to chat',
    UNAUTHORIZED_ACCESS_TO_MESSAGE: 'Unauthorized access to message',
    RECIPIENT_NOT_FOUND: 'Recipient user not found',
    CANNOT_MESSAGE_YOURSELF: 'Cannot send message to yourself',
    MESSAGE_CONTENT_REQUIRED: 'Message content is required',
    CHAT_ALREADY_EXISTS: 'Chat already exists between these users',
    INVALID_MESSAGE_TYPE: 'Invalid message type',
    REPLY_TO_MESSAGE_NOT_FOUND: 'Message to reply to not found',
    CANNOT_REPLY_TO_REPLY: 'Cannot reply to a reply message',

    //timeline
    INVALID_PAGINATION_PARAMETERS: 'limit must be between 1 and 100',
    INVALID_CATEGORY_PARAMETER: 'Invalid category parameter',

    // file
    FILE_NOT_FOUND: 'File not found',
    INVALID_FILE_FORMAT: 'Invalid file format',
    // search
    INVALID_SEARCH_QUERY: 'Invalid search query',

    // tweets
    TWEET_NOT_FOUND: 'Tweet not found',
    TWEET_ALREADY_LIKED: 'Tweet already liked',
    TWEET_NOT_LIKED: 'Tweet not liked yet',
    UNAUTHORIZED_TWEET_ACTION: 'Unauthorized to perform this action on tweet',

    // category
    CATEGORY_NOT_FOUND: 'Category not found',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    // auth
    USER_REGISTERED: 'User successfully registered. Check email for verification',
    SIGNUP_STEP1_COMPLETED: 'Information saved. Check email for verification code',
    SIGNUP_STEP2_COMPLETED: 'Email verified successfully. Please complete your registration',
    SIGNUP_STEP3_COMPLETED: 'Registration completed successfully. You are now logged in',
    LOGGED_IN: 'Logged in Successfully!',
    EMAIL_VERIFIED: 'Email verified successfully',
    OTP_GENERATED: 'OTP generated and sent successfully',
    OTP_VERIFIED: 'OTP verified successfully, you can now reset your password',
    NEW_ACCESS_TOKEN: 'New access token generated',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_RESET_OTP_SENT: 'Password reset OTP sent to your email',
    PASSWORD_RESET: 'Password reset successfully',
    CAPTCHA_SITE_KEY: 'ReCAPTCHA site key retrieved successfully',
    LOGGED_OUT: 'Successfully logged out from this device',
    LOGGED_OUT_ALL: 'Successfully logged out from all devices',
    ACCOUNT_REMOVED: 'Account successfully removed due to unauthorized access report',
    IDENTIFIER_AVAILABLE: 'Identifier is available',
    USERNAME_UPDATED: 'Username updated successfully',
    EMAIL_UPDATE_INITIATED: 'Email update process initiated. Check your new email for verification',
    EMAIL_UPDATED: 'Email updated successfully',

    // OAuth completion
    BIRTH_DATE_SET: 'Birth date set successfully',
    OAUTH_USER_REGISTERED: 'OAuth user registered successfully',

    // chat
    CHAT_CREATED: 'Chat created successfully',
    MESSAGE_SENT: 'Message sent successfully',
    MESSAGE_UPDATED: 'Message updated successfully',
    MESSAGE_DELETED: 'Message deleted successfully',
    CHAT_DELETED: 'Chat deleted successfully',
    CHATS_RETRIEVED: 'Chats retrieved successfully',
    MESSAGES_RETRIEVED: 'Messages retrieved successfully',
    MESSAGE_RETRIEVED: 'Message retrieved successfully',
    CHAT_RETRIEVED: 'Chat retrieved successfully',
    MESSAGE_READ_STATUS_UPDATED: 'Message read status updated successfully',

    //Timeline
    TIMELINE_RETRIEVED: 'Timeline retrieved successfully',
    MENTIONS_RETRIEVED: 'Mentions retrieved successfully',
    TRENDS_RETRIEVED: 'Trends retrieved successfully',

    // user
    USERS_RETRIEVED: 'Users retrieved successfully',
    USER_RETRIEVED: 'User retrieved successfully',
    FOLLOWERS_LIST_RETRIEVED: 'Followers retrieved successfully',
    FOLLOWER_REMOVED: 'Followers removed successfully',
    FOLLOWING_LIST_RETRIEVED: 'Following list retrieved successfully',
    FOLLOW_USER: 'Followed user successfully',
    UNFOLLOW_USER: 'Unfollowed user successfully',
    MUTED_LIST_RETRIEVED: 'Muted list retrieved successfully',
    BLOCKED_LIST_RETRIEVED: 'Blocked list retrieved successfully',
    MUTE_USER: 'Muted user successfully',
    UNMUTE_USER: 'Unmuted user successfully',
    BLOCK_USER: 'Blocked user successfully',
    UNBLOCK_USER: 'Unblocked user successfully',
    LIKED_POSTS_RETRIEVED: 'Retrieved like posts successfully',
    POSTS_RETRIEVED: 'Retrieved posts successfully',
    REPLIES_RETRIEVED: 'Retrieved replies successfully',
    MEDIA_RETRIEVED: 'Retrieved media successfully',
    USER_UPDATED: 'Updated user successfully',
    PHONE_NUMBER_CHANGED: 'Phone number changed successfully',
    ACCOUNT_DEACTIVATED: 'Account deactivated successfully',
    ACCOUNT_REACTIVATED: 'Account reactivated successfully',
    AVATAR_UPLOADED: 'Avatar uploaded successfully',
    COVER_UPLOADED: 'Cover uploaded successfully',
    AVATAR_DELETED: 'Avatar deleted successfully',
    COVER_DELETED: 'Cover deleted successfully',
    INTERESTS_ASSIGNED: 'Interests assigned successfully',

    // search
    SUGGESTIONS_RETRIEVED: 'Search suggestions retrieved successfully',
    SEARCH_USERS_RETRIEVED: 'User search results retrieved successfully',
    SEARCH_POSTS_RETRIEVED: 'Posts search results retrieved successfully',
    SEARCH_LATEST_POSTS_RETRIEVED: 'Latest posts search results retrieved successfully',
    SEARCH_HISTORY_RETRIEVED: 'Search history retrieved successfully',
    SEARCH_HISTORY_CLEARED: 'Search history cleared successfully',
    SEARCH_HISTORY_ITEM_DELETED: 'Search history item deleted successfully',
    SEARCH_HISTORY_QUERY_SAVED: 'Search query saved to history successfully',
    SEARCH_HISTORY_PEOPLE_SAVED: 'People search saved to history successfully',

    // explore
    EXPLORE_TRENDING_RETRIEVED: 'Explore trending items retrieved successfully',
    EXPLORE_WHO_TO_FOLLOW_RETRIEVED: 'Explore who-to-follow suggestions retrieved successfully',
    EXPLORE_FOR_YOU_POSTS_RETRIEVED: 'Explore for-you posts retrieved successfully',

    // file upload
    IMAGE_UPLOADED: 'Image uploaded successfully',
    VIDEO_UPLOADED: 'Video uploaded successfully',

    // tweets
    TWEET_CREATED: 'Tweet created successfully',
    TWEETS_RETRIEVED: 'Tweets retrieved successfully',
    TWEET_RETRIEVED: 'Tweet retrieved successfully',
    TWEET_UPDATED: 'Tweet updated successfully',
    TWEET_DELETED: 'Tweet deleted successfully',
    TWEET_REPOSTED: 'Tweet reposted successfully',
    TWEET_QUOTED: 'Tweet quoted successfully',
    TWEET_LIKED: 'Tweet liked successfully',
    TWEET_UNLIKED: 'Tweet unliked successfully',
    TWEET_LIKES_RETRIEVED: 'Tweet likes retrieved successfully',
    QUOTE_TWEET_UPDATED: 'Quote tweet updated successfully',
} as const;
