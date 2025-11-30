import { ApiProperty } from '@nestjs/swagger';
import { FollowNotificationDto } from './follow-notification.dto';
import { LikeNotificationDto } from './like-notification.dto';
import { ReplyNotificationDto } from './reply-notification.dto';
import { RepostNotificationDto } from './repost-notification.dto';
import { QuoteNotificationDto } from './quote-notification.dto';

export type NotificationDto =
    | FollowNotificationDto
    | LikeNotificationDto
    | ReplyNotificationDto
    | RepostNotificationDto
    | QuoteNotificationDto;

export class NotificationsResponseDto {
    @ApiProperty({
        description: 'Array of notifications in reverse chronological order (newest first)',
        type: 'array',
        items: {
            oneOf: [
                { $ref: '#/components/schemas/FollowNotificationDto' },
                { $ref: '#/components/schemas/LikeNotificationDto' },
                { $ref: '#/components/schemas/ReplyNotificationDto' },
                { $ref: '#/components/schemas/RepostNotificationDto' },
                { $ref: '#/components/schemas/QuoteNotificationDto' },
            ],
        },
        example: [
            {
                type: 'like',
                created_at: '2025-11-29T10:30:00.000Z',
                likers: [
                    {
                        id: '123e4567-e89b-12d3-a456-426614174000',
                        email: 'john.doe@example.com',
                        name: 'John Doe',
                        username: 'johndoe',
                        avatar_url: 'https://example.com/avatar.jpg',
                    },
                ],
                tweet: {
                    tweet_id: '123e4567-e89b-12d3-a456-426614174001',
                    user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                    type: 'original',
                    content: 'This is the most recently liked tweet (aggregated by person)',
                    images: [],
                    videos: [],
                    num_likes: 42,
                    num_reposts: 15,
                    num_replies: 8,
                    num_quotes: 3,
                    num_views: 0,
                    num_bookmarks: 0,
                    created_at: '2025-11-29T09:00:00.000Z',
                    updated_at: '2025-11-29T09:00:00.000Z',
                    deleted_at: null,
                },
            },
            {
                type: 'follow',
                created_at: '2025-11-29T09:15:00.000Z',
                followers: [
                    {
                        id: '223e4567-e89b-12d3-a456-426614174003',
                        email: 'jane.smith@example.com',
                        name: 'Jane Smith',
                        username: 'janesmith',
                        avatar_url: 'https://example.com/avatar2.jpg',
                    },
                ],
            },
            {
                type: 'reply',
                created_at: '2025-11-29T08:45:00.000Z',
                replier: {
                    id: '323e4567-e89b-12d3-a456-426614174004',
                    email: 'alice.j@example.com',
                    name: 'Alice Johnson',
                    username: 'alicej',
                    avatar_url: 'https://example.com/avatar3.jpg',
                },
                reply_tweet: {
                    tweet_id: '423e4567-e89b-12d3-a456-426614174005',
                    user_id: '323e4567-e89b-12d3-a456-426614174004',
                    type: 'reply',
                    content: 'Great point!',
                    images: [],
                    videos: [],
                    num_likes: 5,
                    num_reposts: 1,
                    num_replies: 0,
                    num_quotes: 0,
                    num_views: 0,
                    num_bookmarks: 0,
                    created_at: '2025-11-29T08:45:00.000Z',
                    updated_at: '2025-11-29T08:45:00.000Z',
                    deleted_at: null,
                },
                original_tweet: {
                    tweet_id: '523e4567-e89b-12d3-a456-426614174006',
                    user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                    type: 'original',
                    content: 'What do you think about this?',
                    images: [],
                    videos: [],
                    num_likes: 20,
                    num_reposts: 5,
                    num_replies: 3,
                    num_quotes: 1,
                    num_views: 0,
                    num_bookmarks: 0,
                    created_at: '2025-11-29T07:00:00.000Z',
                    updated_at: '2025-11-29T07:00:00.000Z',
                    deleted_at: null,
                },
                conversation_id: '623e4567-e89b-12d3-a456-426614174007',
            },
            {
                type: 'repost',
                created_at: '2025-11-29T08:00:00.000Z',
                reposters: [
                    {
                        id: '723e4567-e89b-12d3-a456-426614174008',
                        email: 'bob.w@example.com',
                        name: 'Bob Williams',
                        username: 'bobw',
                        avatar_url: 'https://example.com/avatar4.jpg',
                    },
                ],
                tweet: {
                    tweet_id: '823e4567-e89b-12d3-a456-426614174009',
                    user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                    type: 'original',
                    content: 'Check out this amazing content!',
                    images: [],
                    videos: [],
                    num_likes: 100,
                    num_reposts: 25,
                    num_replies: 12,
                    num_quotes: 5,
                    num_views: 0,
                    num_bookmarks: 0,
                    created_at: '2025-11-28T10:00:00.000Z',
                    updated_at: '2025-11-28T10:00:00.000Z',
                    deleted_at: null,
                },
            },
            {
                type: 'quote',
                created_at: '2025-11-29T07:30:00.000Z',
                quoter: {
                    id: '923e4567-e89b-12d3-a456-426614174010',
                    email: 'charlie.b@example.com',
                    name: 'Charlie Brown',
                    username: 'charlieb',
                    avatar_url: 'https://example.com/avatar5.jpg',
                },
                quote_tweet: {
                    tweet_id: 'a23e4567-e89b-12d3-a456-426614174011',
                    user_id: '923e4567-e89b-12d3-a456-426614174010',
                    type: 'quote',
                    content: 'This is exactly what I was thinking!',
                    images: [],
                    videos: [],
                    num_likes: 30,
                    num_reposts: 8,
                    num_replies: 4,
                    num_quotes: 2,
                    num_views: 0,
                    num_bookmarks: 0,
                    created_at: '2025-11-29T07:30:00.000Z',
                    updated_at: '2025-11-29T07:30:00.000Z',
                    deleted_at: null,
                    parent_tweet: {
                        tweet_id: 'b23e4567-e89b-12d3-a456-426614174012',
                        user_id: '958df17b-4921-45e7-9d03-99f6deeeb031',
                        type: 'original',
                        content: 'Here are my thoughts on the topic...',
                        images: [],
                        videos: [],
                        num_likes: 50,
                        num_reposts: 10,
                        num_replies: 8,
                        num_quotes: 3,
                        num_views: 0,
                        num_bookmarks: 0,
                        created_at: '2025-11-29T06:00:00.000Z',
                        updated_at: '2025-11-29T06:00:00.000Z',
                        deleted_at: null,
                    },
                },
            },
        ],
    })
    notifications: NotificationDto[];
}
