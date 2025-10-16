export const NOTIFICATIONS_WEBSOCKET = {
    CONNECTION: {
        URL: 'ws://server/notifications',
        AUTH: 'JWT token required in connection handshake',
        PROTOCOL: 'WebSocket (Socket.IO)',
    },

    CLIENT_EVENTS: {
        SUBSCRIBE_ALL: {
            EVENT: 'subscribe:all',
            DESCRIPTION: 'Subscribe to all notifications (default view)',
            PAYLOAD: null,
            RESPONSE_EVENT: 'notifications:all',
        },
        SUBSCRIBE_MENTIONS: {
            EVENT: 'subscribe:mentions',
            DESCRIPTION: 'Switch to mentions-only view. Uses same connection, no reconnection needed.',
            PAYLOAD: null,
            RESPONSE_EVENT: 'notifications:mentions',
        },
        MARK_SEEN: {
            EVENT: 'mark:seen',
            DESCRIPTION: 'Mark all notifications as seen by the user',
            PAYLOAD: null,
            RESPONSE_EVENT: 'notifications:count',
        },
        REQUEST_COUNT: {
            EVENT: 'get:count',
            DESCRIPTION: 'Request count of unseen notifications',
            PAYLOAD: null,
            RESPONSE_EVENT: 'notifications:count',
        },
    },

    SERVER_EVENTS: {
        NOTIFICATIONS_ALL: {
            EVENT: 'notifications:all',
            DESCRIPTION: 'Sends all notifications for the authenticated user',
            PAYLOAD_STRUCTURE: {
                notifications: 'Array<Notification>',
                total: 'number',
                unseenCount: 'number',
                newestData: 'ISO8601 timestamp of last unseen notification, null if all seen',
            },
            EXAMPLE: {
                notifications: [
                    {
                        id: 'uuid',
                        type: 'like',
                        actors: ['user1', 'user2'],
                        targetId: 'tweet-id',
                        createdAt: '2025-10-17T10:00:00Z',
                        seen: false,
                    }
                ],
                total: 42,
                unseenCount: 5,
                newestData: '2025-10-17T10:00:00Z', // Last unseen notification timestamp
            },
        },
        NOTIFICATIONS_MENTIONS: {
            EVENT: 'notifications:mentions',
            DESCRIPTION: 'Sends mentions-only notifications. Client switches to this view without reconnecting.',
            PAYLOAD_STRUCTURE: {
                notifications: 'Array<Notification> (mentions only)',
                total: 'number',
                unseenCount: 'number',
                newestData: 'ISO8601 timestamp of last unseen mention, null if all seen',
            },
            EXAMPLE: {
                notifications: [
                    {
                        id: 'uuid',
                        type: 'mention',
                        actors: ['user3'],
                        targetId: 'tweet-id',
                        createdAt: '2025-10-17T09:30:00Z',
                        seen: false,
                    }
                ],
                total: 8,
                unseenCount: 2,
                newestData: '2025-10-17T09:30:00Z',
            },
        },
        NOTIFICATION_NEW: {
            EVENT: 'notifications:new',
            DESCRIPTION: 'Real-time push of a new notification. Sent immediately when notification occurs.',
            PAYLOAD_STRUCTURE: {
                notification: 'Notification',
                unseenCount: 'number (updated count)',
                newestData: 'ISO8601 timestamp (updated timestamp)',
            },
            EXAMPLE: {
                notification: {
                    id: 'uuid',
                    type: 'retweet',
                    actors: ['user4'],
                    targetId: 'tweet-id',
                    createdAt: '2025-10-17T11:00:00Z',
                    seen: false,
                },
                unseenCount: 6,
                newestData: '2025-10-17T11:00:00Z',
            },
        },
        NOTIFICATION_COUNT: {
            EVENT: 'notifications:count',
            DESCRIPTION: 'Sends updated count of unseen notifications and newestData timestamp',
            PAYLOAD_STRUCTURE: {
                unseenCount: 'number',
                newestData: 'ISO8601 timestamp or null',
            },
            EXAMPLE: {
                unseenCount: 3,
                newestData: '2025-10-17T10:30:00Z',
            },
        },
    },

    NEWEST_DATA: {
        DESCRIPTION: 'Timestamp of the most recent unseen notification',
        PURPOSE: 'Client uses this to determine if there are new notifications since last check',
        BEHAVIOR: {
            HAS_UNSEEN: 'Contains ISO8601 timestamp of newest unseen notification',
            ALL_SEEN: 'null - indicates all notifications have been seen',
            UPDATED_ON: 'Every new notification, or when notifications are marked as seen',
        },
        USAGE: 'Client can compare newestData with locally stored timestamp to show "new" badge',
        EXAMPLE_FLOW: [
            '1. User connects → newestData: "2025-10-17T10:00:00Z" (5 unseen)',
            '2. User marks as seen → newestData: null (0 unseen)',
            '3. New notification arrives → newestData: "2025-10-17T11:00:00Z" (1 unseen)',
            '4. User switches to mentions tab → same connection, filters data client-side or requests mentions',
            '5. Another notification → newestData: "2025-10-17T11:05:00Z" (2 unseen)',
        ],
    },

    // Connection Flow
    CONNECTION_FLOW: {
        STEP_1: 'Client connects to ws://server/notifications with JWT token',
        STEP_2: 'Server authenticates and stores connection',
        STEP_3: 'Server immediately sends "notifications:all" with initial data + newestData',
        STEP_4: 'Client displays notifications (All tab is default)',
        STEP_5: 'User switches to Mentions tab → Client emits "subscribe:mentions"',
        STEP_6: 'Server sends "notifications:mentions" through SAME connection',
        STEP_7: 'New notification happens → Server pushes "notifications:new" to client',
        STEP_8: 'Client updates UI and newestData timestamp',
        STEP_9: 'User marks as seen → Client emits "mark:seen"',
        STEP_10: 'Server updates DB and sends "notifications:count" with newestData: null',
    },

    FEATURES: {
        SINGLE_CONNECTION: 'One WebSocket connection handles all notification views (All/Mentions)',
        REAL_TIME: 'New notifications pushed immediately via "notifications:new" event',
        NO_RECONNECTION: 'Switching between All/Mentions tabs uses same connection',
        NEWEST_DATA_TRACKING: 'newestData timestamp tracks last unseen notification for badge display',
        AGGREGATION: 'Multiple users performing same action are aggregated (e.g., "User1, User2 liked your post")',
        PAGINATION: 'Initial load can be paginated, real-time updates are instant',
    },
};

export const NOTIFICATIONS_SWAGGER = {
    DEPRECATED_NOTE: 'This module uses WebSocket connections only. No REST endpoints available.',
    SEE_INSTEAD: 'NOTIFICATIONS_WEBSOCKET for WebSocket documentation',
};

