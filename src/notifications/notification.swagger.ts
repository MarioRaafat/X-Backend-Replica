export const notifications_websocket = {
  connection: {
    url: 'ws://server/notifications',
    auth: 'JWT token required in connection handshake',
    protocol: 'WebSocket (Socket.IO)',
  },

  client_events: {
    subscribe_all: {
      event: 'subscribe:all',
      description: 'Subscribe to all notifications (default view)',
      payload: null,
      response_event: 'notifications:all',
    },
    subscribe_mentions: {
      event: 'subscribe:mentions',
      description:
        'Switch to mentions-only view. Uses same connection, no reconnection needed.',
      payload: null,
      response_event: 'notifications:mentions',
    },
    mark_seen: {
      event: 'mark:seen',
      description: 'Mark all notifications as seen by the user',
      payload: null,
      response_event: 'notifications:count',
    },
    request_count: {
      event: 'get:count',
      description: 'Request count of unseen notifications',
      payload: null,
      response_event: 'notifications:count',
    },
  },

  server_events: {
    notifications_all: {
      event: 'notifications:all',
      description: 'Sends all notifications for the authenticated user',
      payload_structure: {
        notifications: 'Array<Notification>',
        total: 'number',
        unseenCount: 'number',
        newestData:
          'ISO8601 timestamp of last unseen notification, null if all seen',
      },
      example: {
        notifications: [
          {
            id: 'uuid',
            type: 'like',
            actors: ['user1', 'user2'],
            targetId: 'tweet-id',
            createdAt: '2025-10-17T10:00:00Z',
            seen: false,
          },
        ],
        total: 42,
        unseenCount: 5,
        newestData: '2025-10-17T10:00:00Z', // Last unseen notification timestamp
      },
    },
    notifications_mentions: {
      event: 'notifications:mentions',
      description:
        'Sends mentions-only notifications. Client switches to this view without reconnecting.',
      payload_structure: {
        notifications: 'Array<Notification> (mentions only)',
        total: 'number',
        unseenCount: 'number',
        newestData:
          'ISO8601 timestamp of last unseen mention, null if all seen',
      },
      example: {
        notifications: [
          {
            id: 'uuid',
            type: 'mention',
            actors: ['user3'],
            targetId: 'tweet-id',
            createdAt: '2025-10-17T09:30:00Z',
            seen: false,
          },
        ],
        total: 8,
        unseenCount: 2,
        newestData: '2025-10-17T09:30:00Z',
      },
    },
    notification_new: {
      event: 'notifications:new',
      description:
        'Real-time push of a new notification. Sent immediately when notification occurs.',
      payload_structure: {
        notification: 'Notification',
        unseenCount: 'number (updated count)',
        newestData: 'ISO8601 timestamp (updated timestamp)',
      },
      example: {
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
    notification_count: {
      event: 'notifications:count',
      description:
        'Sends updated count of unseen notifications and newestData timestamp',
      payload_structure: {
        unseenCount: 'number',
        newestData: 'ISO8601 timestamp or null',
      },
      example: {
        unseenCount: 3,
        newestData: '2025-10-17T10:30:00Z',
      },
    },
  },

  newest_data: {
    description: 'Timestamp of the most recent unseen notification',
    purpose:
      'Client uses this to determine if there are new notifications since last check',
    behavior: {
      has_unseen: 'Contains ISO8601 timestamp of newest unseen notification',
      all_seen: 'null - indicates all notifications have been seen',
      updated_on:
        'Every new notification, or when notifications are marked as seen',
    },
    usage:
      'Client can compare newestData with locally stored timestamp to show "new" badge',
    example_flow: [
      '1. User connects → newestData: "2025-10-17T10:00:00Z" (5 unseen)',
      '2. User marks as seen → newestData: null (0 unseen)',
      '3. New notification arrives → newestData: "2025-10-17T11:00:00Z" (1 unseen)',
      '4. User switches to mentions tab → same connection, filters data client-side or requests mentions',
      '5. Another notification → newestData: "2025-10-17T11:05:00Z" (2 unseen)',
    ],
  },

  // Connection Flow
  connection_flow: {
    step_1: 'Client connects to ws://server/notifications with JWT token',
    step_2: 'Server authenticates and stores connection',
    step_3:
      'Server immediately sends "notifications:all" with initial data + newestData',
    step_4: 'Client displays notifications (All tab is default)',
    step_5: 'User switches to Mentions tab → Client emits "subscribe:mentions"',
    step_6: 'Server sends "notifications:mentions" through SAME connection',
    step_7:
      'New notification happens → Server pushes "notifications:new" to client',
    step_8: 'Client updates UI and newestData timestamp',
    step_9: 'User marks as seen → Client emits "mark:seen"',
    step_10:
      'Server updates DB and sends "notifications:count" with newestData: null',
  },

  features: {
    single_connection:
      'One WebSocket connection handles all notification views (All/Mentions)',
    real_time:
      'New notifications pushed immediately via "notifications:new" event',
    no_reconnection: 'Switching between All/Mentions tabs uses same connection',
    newest_data_tracking:
      'newestData timestamp tracks last unseen notification for badge display',
    aggregation:
      'Multiple users performing same action are aggregated (e.g., "User1, User2 liked your post")',
    pagination: 'Initial load can be paginated, real-time updates are instant',
  },
};

export const notifications_swagger = {
  deprecated_note:
    'This module uses WebSocket connections only. No REST endpoints available.',
  see_instead: 'NOTIFICATIONS_WEBSOCKET for WebSocket documentation',
};
