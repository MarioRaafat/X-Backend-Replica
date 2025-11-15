import { notifications_websocket } from './notification.swagger';

describe('notification.swagger', () => {
    it('should be defined', () => {
        expect(notifications_websocket).toBeDefined();
    });

    describe('connection', () => {
        it('should have connection configuration', () => {
            expect(notifications_websocket.connection).toBeDefined();
            expect(notifications_websocket.connection.url).toBe('ws://server/notifications');
            expect(notifications_websocket.connection.auth).toBe(
                'JWT token required in connection handshake'
            );
            expect(notifications_websocket.connection.protocol).toBe('WebSocket (Socket.IO)');
        });
    });

    describe('client_events', () => {
        it('should have client events defined', () => {
            expect(notifications_websocket.client_events).toBeDefined();
        });

        it('should have subscribe_all event', () => {
            const event = notifications_websocket.client_events.subscribe_all;
            expect(event.event).toBe('subscribe:all');
            expect(event.description).toBe('Subscribe to all notifications (default view)');
            expect(event.payload).toBeNull();
            expect(event.response_event).toBe('notifications:all');
        });

        it('should have subscribe_mentions event', () => {
            const event = notifications_websocket.client_events.subscribe_mentions;
            expect(event.event).toBe('subscribe:mentions');
            expect(event.description).toContain('mentions-only view');
            expect(event.payload).toBeNull();
            expect(event.response_event).toBe('notifications:mentions');
        });

        it('should have mark_seen event', () => {
            const event = notifications_websocket.client_events.mark_seen;
            expect(event.event).toBe('mark:seen');
            expect(event.description).toContain('Mark all notifications as seen');
            expect(event.payload).toBeNull();
            expect(event.response_event).toBe('notifications:count');
        });

        it('should have request_count event', () => {
            const event = notifications_websocket.client_events.request_count;
            expect(event.event).toBe('get:count');
            expect(event.description).toContain('Request count of unseen notifications');
            expect(event.payload).toBeNull();
            expect(event.response_event).toBe('notifications:count');
        });
    });

    describe('server_events', () => {
        it('should have server events defined', () => {
            expect(notifications_websocket.server_events).toBeDefined();
        });

        it('should have notifications_all event', () => {
            const event = notifications_websocket.server_events.notifications_all;
            expect(event.event).toBe('notifications:all');
            expect(event.description).toContain('all notifications');
            expect(event.payload_structure).toBeDefined();
            expect(event.payload_structure.notifications).toBe('Array<Notification>');
            expect(event.payload_structure.total).toBe('number');
            expect(event.payload_structure.unseenCount).toBe('number');
            expect(event.example).toBeDefined();
        });

        it('should have notifications_mentions event', () => {
            const event = notifications_websocket.server_events.notifications_mentions;
            expect(event.event).toBe('notifications:mentions');
            expect(event.description).toContain('mentions-only');
            expect(event.payload_structure).toBeDefined();
            expect(event.example).toBeDefined();
        });

        it('should have notification_new event', () => {
            const event = notifications_websocket.server_events.notification_new;
            expect(event.event).toBe('notifications:new');
            expect(event.description).toContain('Real-time push');
            expect(event.payload_structure).toBeDefined();
            expect(event.payload_structure.notification).toBe('Notification');
            expect(event.payload_structure.unseenCount).toContain('number');
        });

        it('should have valid example structure for notifications_all', () => {
            const example = notifications_websocket.server_events.notifications_all.example;
            expect(example.notifications).toBeInstanceOf(Array);
            expect(example.total).toBe(42);
            expect(example.unseenCount).toBe(5);
            expect(example.newestData).toBe('2025-10-17T10:00:00Z');
        });

        it('should have valid notification structure in examples', () => {
            const notification =
                notifications_websocket.server_events.notifications_all.example.notifications[0];
            expect(notification.id).toBe('uuid');
            expect(notification.type).toBe('like');
            expect(notification.actors).toBeInstanceOf(Array);
            expect(notification.targetId).toBe('tweet-id');
            expect(notification.createdAt).toBe('2025-10-17T10:00:00Z');
            expect(notification.seen).toBe(false);
        });
    });

    it('should have 4 client events', () => {
        const client_events = Object.keys(notifications_websocket.client_events);
        expect(client_events).toHaveLength(4);
    });

    it('should have at least 3 server events', () => {
        const server_events = Object.keys(notifications_websocket.server_events);
        expect(server_events.length).toBeGreaterThanOrEqual(3);
    });
});
