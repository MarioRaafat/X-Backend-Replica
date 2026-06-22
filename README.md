# Yapper Backend (X Replica)

This repository contains the backend service for a social-media-style platform implemented with NestJS. It provides authentication, user management, timelines, search, trends, notifications, chat, and utilities for seeding and testing.

## Features

- Authentication
    - JWT access/refresh tokens with secure rotation
    - OAuth 2.0 (Google, GitHub)
    - Email verification (OTP + "Not me" verification link)
    - Forgot / Reset password flows
    - Logout single device or revoke all refresh tokens (logout from all devices)
    - Captcha integration

- User & Settings
    - Follow / unfollow users
    - Block users, mute users
    - Update profile (display name, bio, avatar)
    - Change language and other user preferences

- Timeline
    - Create, update, delete posts (tweets)
    - "For you" feed: personalized recommendations based on user interests
    - "Following" feed: posts from followed users

- Trend
    - Daily-updated top hashtag trends across categories
    - Redis-backed ranking of active hashtags using tweet volume, momentum, and recency signals
    - Supports global trends plus category-filtered trends for Sports, News, and Entertainment

- Search
    - User search via PostgreSQL Full-Text Search (FTS) with boosted ranking for followed users
    - Post search via Elasticsearch using ranking signals (trending hashtags, interaction counts, author popularity)
    - Exact-match hashtag searches for precise results

- Notifications
    - Real-time notifications using WebSockets
    - Push notifications using Firebase Cloud Messaging (FCM)
    - Notifications are updated or removed when the trigger content changes or is deleted

- Chat
    - Real-time chat via WebSockets
    - Message reactions and basic presence indicators

- Database Seeding
    - Seeder imports n8n-scraped X data into the database
    - Seed dataset includes about 60,000 users and 78,000 posts across 30 X topics

## X Scraping Workflows

We use n8n scraping workflows to get real user data through @[twitterapi.io](https://twitterapi.io/). Each workflow can be configured to fetch more or fewer items.

- **Tweets scraping:**
    - Uses the Twitter advanced_search endpoint to collect tweets (example: query="sports").
    - Extracts tweet fields (id, url, text, counts, createdAt) and media (photos, best MP4 variant for videos/GIFs).
    - Paginates via cursor and uses a counter/limit loop with short Wait nodes to avoid hitting rate limits.
    - Appends tweets to the “tweets” sheet and also extracts tweet authors (saved to the “users” sheet).

- **Replies scraping:**
    - Reads tweet IDs from the sheet and calls the replies endpoint for each tweet.
    - Formats replies similarly to tweets (conversationId, tweetId, authorId, content, counts, media).
    - Uses split-in-batches + Wait nodes for per-item throttling.
    - Appends replies to the “replies” sheet and extracts reply authors to the “users” sheet.
    - Includes sampling logic to limit load (the workflow processes a subset of tweets/replies to reduce API calls).
- **Users / Followers / Following scraping:**
    - Read input: three Google Sheets nodes load Tweets, Quotes and Replies.
    - Merge & extract: merged rows are scanned to build a unique list of author IDs and split into batches.
    - User info:each batch is sent to the Twitter API (batch_user_info_by_ids). Returned users are formatted and appended to the “users” sheet.
    - Per-user loop: the workflow splits over each saved user and, calls the Twitter API to get up to 100 followers and 100 following per user.

**Notes and tips**

- Configure your excel sheets names and API credentials before starting.
- Respect API rate limits and legal/privacy constraints when scraping.
- Start with small limits during testing the workflow to avoid being rate-limited.
- Tune batchSize and wait durations if you encounter rate-limit errors.

## Tech Stack

- NestJS (TypeScript)
- PostgreSQL (primary relational store)
- MongoDB (for notifications)
- Redis (cache, rate limiting, session/refresh token store, BullMQ backend)
- Elasticsearch (post search)
- Firebase Cloud Messaging (push notifications)
- BullMQ (background jobs / queues)

## Repository Layout

```
.
├── src/                              # Main application source code
│   ├── auth/                         # Authentication module (JWT, OAuth, OTP, captcha)
│   │   ├── dto/                      # Data transfer objects (login, register, token)
│   │   ├── entities/                 # Auth-related entities
│   │   ├── guards/                   # Auth guards (JwtGuard, RolesGuard, etc.)
│   │   ├── strategies/               # Passport strategies (JWT, Google, GitHub)
│   │   ├── auth.service.ts           # Core auth logic
│   │   ├── auth.controller.ts        # Auth endpoints
│   │   └── [*.spec.ts]               # Unit tests
│   ├── user/                         # User management module
│   │   ├── dto/                      # User DTOs (profile, settings)
│   │   ├── entities/                 # User, Profile, Settings entities
│   │   ├── user.service.ts           # User operations (follow, block, mute, profile)
│   │   ├── user.repository.ts        # User database queries
│   │   ├── user.controller.ts        # User endpoints
│   │   └── [*.spec.ts]
│   ├── timeline/                     # Posts/Tweets module
│   │   ├── dto/                      # Post/Tweet DTOs
│   │   ├── entities/                 # Post, Tweet, Interaction entities
│   │   ├── timeline.service.ts       # Post creation, feeds ("For You", "Following")
│   │   ├── timeline.repository.ts    # Post database queries
│   │   ├── timeline.controller.ts
│   │   └── [*.spec.ts]
│   ├── search/                       # Search functionality module
│   │   ├── dto/                      # Search request/response DTOs
│   │   ├── search.service.ts         # User & post search (FTS, Elasticsearch)
│   │   ├── search.repository.ts      # Search queries
│   │   ├── search.controller.ts
│   │   └── [*.spec.ts]
│   ├── trend/                        # Trending hashtags module
│   │   ├── dto/                      # Trend DTOs
│   │   ├── entities/                 # Hashtag, Trend entities
│   │   ├── trend.service.ts          # Redis-backed hashtag trends
│   │   ├── trend.repository.ts       # Trend queries
│   │   ├── trend.controller.ts
│   │   └── [*.spec.ts]
│   ├── notifications/                # Notifications module (WebSocket & FCM)
│   │   ├── dto/                      # Notification DTOs
│   │   ├── entities/                 # Notification entity
│   │   ├── notifications.service.ts  # Real-time & push notifications
│   │   ├── notifications.gateway.ts  # WebSocket gateway
│   │   ├── notifications.repository.ts
│   │   └── [*.spec.ts]
│   ├── chat/                         # Real-time chat module
│   │   ├── dto/                      # Message, Reaction DTOs
│   │   ├── entities/                 # Message, Conversation, Reaction entities
│   │   ├── chat.service.ts           # Message handling & reactions
│   │   ├── chat.gateway.ts           # WebSocket gateway
│   │   ├── chat.repository.ts        # Message database queries
│   │   └── [*.spec.ts]
│   ├── category/                     # Category management
│   │   ├── dto/                      # Category DTOs
│   │   ├── entities/                 # Category entity
│   │   └── category.repository.ts
│   ├── communication/                # Communication utilities
│   ├── background-jobs/              # BullMQ background job queues
│   │   ├── ai-summary/               # AI summary jobs
│   │   ├── email/                    # Email sending jobs
│   │   ├── elasticsearch/            # ES indexing jobs
│   │   ├── notifications/            # Notification jobs
│   │   ├── timeline/                 # Timeline processing jobs
│   │   └── [other queues...]
│   ├── elasticsearch/                # Elasticsearch integration
│   ├── redis/                        # Redis integration
│   ├── azure-storage/                # Azure blob storage integration
│   ├── gateway/                      # WebSocket gateways
│   ├── databases/                    # Database configurations
│   ├── middlewares/                  # Express middlewares
│   ├── decorators/                   # Custom NestJS decorators
│   ├── interceptor/                  # Request/response interceptors
│   ├── messages/                     # Message templates & constants
│   ├── validations/                  # Custom validation pipes
│   ├── verification/                 # Email/OTP verification
│   ├── constants/                    # App-wide constants
│   ├── shared/                       # Shared utilities & helpers
│   ├── templates/                    # Email & notification templates
│   ├── app.module.ts                 # Root module
│   ├── app.service.ts
│   ├── app.controller.ts
│   └── main.ts                       # Bootstrap file
├── test/
│   ├── app.e2e-spec.ts               # End-to-end tests
│   └── jest-e2e.json                 # Jest E2E configuration
├── docker/                           # Docker & containerization
│   ├── Dockerfile                    # NestJS app container
│   ├── docker-compose.local.yml      # Local development stack
│   ├── docker-compose.prod.yml       # Production stack
│   ├── build-docker.sh               # Build script
│   └── DEPLOYMENT.md                 # Deployment guide
├── config/
│   └── local.env                     # Local environment template
├── assets/                           # Seed data & test fixtures
│   └── testing data/
│       ├── avatars/                  # User avatar images
│       ├── user1/, user2/, user3/    # Sample test users
├── coverage/                         # Jest test coverage reports
├── certs/                            # SSL certificates
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript base config
├── tsconfig.build.json               # TypeScript build config
├── nest-cli.json                     # NestJS CLI config
├── eslint.config.mjs                 # ESLint configuration
├── sonar-project.properties          # SonarQube configuration
└── README.md                         # Project's Readme file
```

## Getting Started (Local)

Prerequisites:

- Node.js 18+ and npm/yarn
- PostgreSQL
- Redis
- Elasticsearch
- MongoDB

Install dependencies:

```bash
npm install
```

Copy example environment variables and fill values:

```bash
cp config/local.env .env
# edit .env and set DATABASE_URL, REDIS_URL, ELASTIC_URL, JWT secrets, OAuth credentials, FCM key, etc.
```

Start the application (recommended via Docker Compose):

```bash
docker-compose -f docker/docker-compose.local.yml up -d
```

Run app in development:

```bash
npm run start:dev
```

## Seeding Data

The project provides a seeding script that imports scrapped data (collected via n8n) into the database. Typical usage:

```bash
npm run seed
npm run es:reset
npm run es:seed
```

Adjust the path or flags based on your implementation in `package.json`.

## Tests

- Run unit tests:

```bash
npm run test
```

- Run e2e tests:

```bash
npm run test:e2e
```

- Test coverage:

```bash
npm run test:cov
```

Each module contains its unit tests next to implementation files (e.g., `src/auth/*.spec.ts`).

## Contributors

| Avatar                                                                                                               | Name           | Username                                           |
| -------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- |
| <img src="https://avatars.githubusercontent.com/MarioRaafat?v=4" width="60" height="60" style="border-radius:50%">   | Mario Raafat   | [@MarioRaafat](https://github.com/MarioRaafat)     |
| <img src="https://avatars.githubusercontent.com/AmiraKhalid04?v=4" width="60" height="60" style="border-radius:50%"> | Amira Khalid   | [@AmiraKhalid04](https://github.com/AmiraKhalid04) |
| <img src="https://avatars.githubusercontent.com/MoBahgat010?v=4" width="60" height="60" style="border-radius:50%">   | Mohamed Bahgat | [@MoBahgat010](https://github.com/MoBahgat010)     |
| <img src="https://avatars.githubusercontent.com/alyaa242?v=4" width="60" height="60" style="border-radius:50%">      | Alyaa Ali      | [@alyaa242](https://github.com/alyaa242)           |
| <img src="https://avatars.githubusercontent.com/shady-2004?v=4" width="60" height="60" style="border-radius:50%">    | Shady Mohamed  | [@shady-2004](https://github.com/shady-2004)       |
