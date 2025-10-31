# Tweets Module Overview

This module exposes authenticated REST endpoints that allow users to publish tweets, interact with existing tweets, and discover engagement details. The controller is documented via `tweets.swagger.ts`, keeping Swagger metadata centralized and easy to maintain.

## Core Workflow

1. **Create Tweet**
   - Endpoint: `POST /tweets`
   - Body: `CreateTweetDTO` (text + optional media arrays)
   - Actor: Authenticated user (ID read from JWT)

2. **Timeline & Retrieval**
   - Endpoint: `GET /tweets`
   - Supports `page` and `limit` query params for pagination.
   - Returns the latest tweets first (service handles ordering and aggregation).
   - Individual tweets available via `GET /tweets/:id`.

3. **Editing & Deleting**
   - Endpoint: `PATCH /tweets/:id`
   - Only the tweet owner can modify text or media.
   - Endpoint: `DELETE /tweets/:id`
   - Removes tweet permanently when requester owns it.

4. **Amplification Actions**
   - **Repost**: `POST /tweets/:id/repost` (status-only response). Each user can only repost a tweet once.
   - **Unrepost**: `DELETE /tweets/:id/repost` (removes your repost of the specified tweet).
   - **Quote**: `POST /tweets/:id/quote` with optional commentary body.
   - **Quote Update**: `PATCH /tweets/:id/quote` for editing an existing quote tweet.

5. **Reactions**
   - **Like**: `POST /tweets/:id/like` (204 status).
   - **Unlike**: `DELETE /tweets/:id/like` (204 status).
   - **Who Liked**: `GET /tweets/:id/likes` returns aggregated liker data and totals.
   - **Who Reposted**: `GET /tweets/:id/reposts` returns users who reposted this tweet.
   - **Quote Tweets**: `GET /tweets/:id/quotes` returns all quote tweets for this tweet with full tweet data.

## Documentation Pattern

- All Swagger metadata lives in `tweets.swagger.ts`.
- The controller imports the shared definitions to describe operations, params, queries, and responses consistently.
- Any future changes to descriptions or examples can be updated in one place without touching route handlers.

## Key DTOs

- `CreateTweetDTO`: Validates text length, media arrays, and visibility.
- `UpdateTweetDTO`: Partial update variant for standard tweets.
- `UpdateTweetWithQuoteDTO`: Used when editing quote tweets with optional commentary adjustments.

## Entities

- `Tweet`: Primary record representing authored content.
- `TweetRepost`: Stores repost relationships. Has a unique constraint on (user_id, tweet_id) to ensure each user can only repost a tweet once. The repost ID is maintained for cursor-based pagination.
- `TweetQuote`: Stores quote tweet relationships.
- `TweetReply`: Stores reply relationships and conversation threading.
- `TweetLike`: Stores like relationships between users and tweets.

## Next Steps

- Ensure TweetService implements actual persistence logic and respects ownership checks.
- Add guards/interceptors (e.g., JWT guard and response wrapping) as needed in the controller.
- Expand Swagger examples to include sample payloads once response DTOs are finalized.
