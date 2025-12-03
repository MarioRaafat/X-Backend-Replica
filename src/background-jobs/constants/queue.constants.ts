export const QUEUE_NAMES = {
    EMAIL: 'email-queue',
    TIMELINE: 'timeline-queue',
    FEED: 'feed-queue',
    NOTIFICATION: 'notification-queue',
    ELASTICSEARCH: 'elasticsearch-queue',
} as const;

export const JOB_NAMES = {
    EMAIL: {
        SEND_OTP: 'send-otp-email',
    },
    TIMELINE: {
        PREPARE_FEED: 'prepare-user-feed',
    },
    FEED: {
        INDEX_TWEET: 'index-tweet-to-elastic',
    },
    NOTIFICATION: {
        FOLLOW: 'follow-notification',
        REPLY: 'reply-notification',
        LIKE: 'like-notification',
    },
    ELASTICSEARCH: {
        INDEX_USER: 'index_user',
        UPDATE_USER: 'update_user',
        DELETE_USER: 'delete_user',

        INDEX_TWEET: 'index_tweet',
        UPDATE_TWEET: 'update_tweet',
        DELETE_TWEET: 'delete_tweet',

        UPDATE_TWEETS_AUTHOR_INFO: 'update_tweets_author_info',
    },
} as const;

export const JOB_PRIORITIES = {
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
} as const;

export const JOB_DELAYS = {
    IMMEDIATE: 0,
    SHORT: 5000, // 5 seconds
    MEDIUM: 30000, // 30 seconds
    LONG: 300000, // 5 minutes
} as const;
