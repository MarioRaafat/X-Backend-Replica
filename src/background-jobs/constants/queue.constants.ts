export const QUEUE_NAMES = {
    EMAIL: 'email-queue',
    TIMELINE: 'timeline-queue',
    FEED: 'feed-queue',
    NOTIFICATION: 'notification-queue',
    EXPLORE: 'explore-score-updates',
    ELASTICSEARCH: 'elasticsearch-queue',
    VIDEO: 'video-queue',
    AI_SUMMARY: 'ai-summary-queue',

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
        REPOST: 'repost-notification',
        QUOTE: 'quote-notification',
        MENTION: 'mention-notification',
        MESSAGE: 'message-notification',
        CLEAR: 'clear-notifications',
    },
    ELASTICSEARCH: {
        INDEX_TWEET: 'index-tweet',
        DELETE_TWEET: 'delete-tweet',
        UPDATE_USER: 'update-user',
        DELETE_USER: 'delete-user',
        FOLLOW: 'follow',
    },
    EXPLORE: {
        RECALCULATE_SCORES: 'recalculate-explore-scores',
    },
    VIDEO: {
        COMPRESS: 'compress-video',
    },
    AI_SUMMARY: {
        GENERATE_TWEET_SUMMARY: 'generate-tweet-summary',
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

export const EXPLORE_CONFIG = {
    ENGAGEMENT_WEIGHTS: {
        LIKE: 1,
        REPOST: 2,
        QUOTE: 3,
        REPLY: 1,
    },
    GRAVITY: 1.8,
    TIME_OFFSET: 2,
    DEFAULT_MAX_AGE_HOURS: 24 * 7,
    DEFAULT_SINCE_HOURS: 1,
    DEFAULT_BATCH_SIZE: 500,
    MIN_SCORE_THRESHOLD: 0.001,
    MAX_CATEGORY_SIZE: 20,
} as const;

export const EXPLORE_CRON_SCHEDULE = '30 * * * *'; // Every hour at minute 30

export const EXPLORE_JOB_PRIORITIES = {
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
};

export const EXPLORE_JOB_RETRY = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 5000,
    },
};
