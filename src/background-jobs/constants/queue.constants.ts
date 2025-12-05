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
        REPOST: 'repost-notification',
        QUOTE: 'quote-notification',
        MENTION: 'mention-notification',
        CLEAR: 'clear-notifications',
    },
    ELASTICSEARCH: {
        INDEX_TWEET: 'index-tweet',
        DELETE_TWEET: 'delete-tweet',
        UPDATE_USER: 'update-user',
        DELETE_USER: 'delete-user',
        FOLLOW: 'follow',
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
