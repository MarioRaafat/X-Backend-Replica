export const QUEUE_NAMES = {
    EMAIL: 'email-queue',
    TIMELINE: 'timeline-queue',
    FEED: 'feed-queue',
    NOTIFICATION: 'notification-queue',

    HASHTAG: 'hashtag-queue',
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
    HASHTAG: {
        UPDATE_HASHTAG: 'update-hashtag',
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
