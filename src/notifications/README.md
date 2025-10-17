# Notifications WebSocket Architecture

This module delivers notifications exclusively over a single WebSocket connection. No REST endpoints are used for fetching or updating notification data.

## Connection Lifecycle

1. **Client connects** to `ws://<host>/notifications` providing a JWT in the handshake.
2. **Server authenticates** the token and establishes a single persistent socket (Socket.IO).
3. **Initial payload** is emitted immediately with the total `unseenCount` across all categories.
4. **Client stays on the same connection** to request different slices of notifications or to receive real-time updates. No reconnection is required when switching views.

## Requesting Notification Lists

The client emits events on the same socket to control which notifications to receive:

- `subscribe:all` – Fetches all notifications. The server responds with a paginated `notifications:all` payload.
- `subscribe:mentions` – Fetches only mention notifications. The server responds with a paginated `notifications:mentions` payload.

### Pagination Rules

- Both payloads include `notifications`, `page`, `limit`, `total`, and `unseenCount` fields.
- Clients pass pagination hints (e.g. `{ page: 2, limit: 20 }`) as part of the emit payload when switching views or requesting additional pages.
- Pagination state is managed per socket connection; clients re-emit the same event with new pagination parameters to navigate between pages.

## Real-Time Updates

Whenever a new notification is generated for the user:

1. The backend stores the notification.
2. The same WebSocket connection emits `notifications:new` containing the notification payload alongside the updated `unseenCount`.
3. The client updates its UI immediately without polling.

## Seen State Management

- Clients emit `mark:seen` to mark notifications as read.
- Server responds with `notifications:count` summarizing the new `unseenCount`.

## Event Summary

| Direction | Event | Purpose |
|-----------|-------|---------|
| Client → Server | `subscribe:all` | Request paginated list of all notifications. |
| Client → Server | `subscribe:mentions` | Request paginated list limited to mentions. |
| Client → Server | `mark:seen` | Mark current notifications as seen. |
| Client → Server | `get:count` | Request latest unseen count without changing view. |
| Server → Client | `notifications:all` | Paginated list of all notifications with unseen metadata. |
| Server → Client | `notifications:mentions` | Paginated list of mention notifications. |
| Server → Client | `notifications:new` | Real-time push for a newly created notification. |
| Server → Client | `notifications:count` | Updated unseen count. |

## Client Responsibilities

- Maintain a single socket connection for the entire session.
- Switch between views by emitting the relevant subscribe event (no reconnection).
- Use pagination parameters when the user scrolls or requests more historical notifications.

## Server Responsibilities

- Validate the JWT at connection time and reject unauthenticated clients.
- Send initial `unseenCount` once per connection.
- Respect pagination inputs and return consistent `page`, `limit`, and `total` values.
- Push real-time updates through `notifications:new` for any new activity targeting the user.
- Update and broadcast `unseenCount` on mark-as-seen actions or new notification creation.

This architecture ensures every notification update is delivered instantly over a single, authenticated WebSocket channel while allowing clients to retrieve historical data on demand without additional HTTP requests.
