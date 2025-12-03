export const QUEUE_NAMES = {
    EMAIL: 'email-queue',
    TIMELINE: 'timeline-queue',
    FEED: 'feed-queue',
    NOTIFICATION: 'notification-queue',
    TRENDING: 'trending-score-updates',
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
        SEND_BULK: 'send-bulk-notifications',
    },
    TRENDING: {
        RECALCULATE_SCORES: 'recalculate-trending-scores',
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

export const TRENDING_CONFIG = {
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

export const TRENDING_CRON_SCHEDULE = '0 * * * *'; // Every hour

export const TRENDING_JOB_PRIORITIES = {
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
};

export const TRENDING_JOB_RETRY = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 5000,
    },
};


