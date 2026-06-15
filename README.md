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
  - Seeder script imports scraped data (via n8n) into the databases for testing and local development

- Testing
  - Unit tests for every module (Jest)
  - Integration/e2e tests where applicable

## Tech Stack

- NestJS (TypeScript)
- PostgreSQL (primary relational store)
- MongoDB (for notifications)
- Redis (cache, rate limiting, session/refresh token store, BullMQ backend)
- Elasticsearch (post search)
- Firebase Cloud Messaging (push notifications)
- BullMQ (background jobs / queues)

## Repository Layout (high level)

- `src/` — application source code and modules (auth, user, timeline, search, notifications, chat...)
- `test/` — e2e and test configuration
- `docker/` — dockerfiles and compose files for local development
- `assets/` — seed data and testing assets

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


| Avatar | Name | Username |
|--------|------|--------|
| <img src="https://avatars.githubusercontent.com/MarioRaafat?v=4" width="60" height="60" style="border-radius:50%"> | Mario Raafat | [@MarioRaafat](https://github.com/MarioRaafat) |
| <img src="https://avatars.githubusercontent.com/AmiraKhalid04?v=4" width="60" height="60" style="border-radius:50%"> | Amira Khalid | [@AmiraKhalid04](https://github.com/AmiraKhalid04) |
| <img src="https://avatars.githubusercontent.com/MoBahgat010?v=4" width="60" height="60" style="border-radius:50%"> | Mohamed Bahgat | [@MoBahgat010](https://github.com/MoBahgat010) |
| <img src="https://avatars.githubusercontent.com/alyaa242?v=4" width="60" height="60" style="border-radius:50%"> | Alyaa Ali | [@alyaa242](https://github.com/alyaa242) |
| <img src="https://avatars.githubusercontent.com/shady-2004?v=4" width="60" height="60" style="border-radius:50%"> | Shady Mohamed | [@shady-2004](https://github.com/shady-2004) |

