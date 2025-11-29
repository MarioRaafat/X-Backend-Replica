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
                liker: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    name: 'John Doe',
                    username: 'johndoe',
                    avatar_url: 'https://example.com/avatar.jpg',
                    email: 'john.doe@example.com',
                    verified: true,
                },
                tweet: {
                    tweet_id: '123e4567-e89b-12d3-a456-426614174001',
                    content: 'This is an example tweet!',
                    num_likes: 42,
                    num_reposts: 15,
                    num_replies: 8,
                    num_quotes: 3,
                    created_at: '2025-11-29T09:00:00.000Z',
                },
            },
            {
                type: 'follow',
                created_at: '2025-11-29T09:15:00.000Z',
                follower: {
                    id: '223e4567-e89b-12d3-a456-426614174003',
                    name: 'Jane Smith',
                    username: 'janesmith',
                    avatar_url: 'https://example.com/avatar2.jpg',
                    email: 'jane.smith@example.com',
                    verified: false,
                },
            },
            {
                type: 'reply',
                created_at: '2025-11-29T08:45:00.000Z',
                replier: {
                    id: '323e4567-e89b-12d3-a456-426614174004',
                    name: 'Alice Johnson',
                    username: 'alicej',
                    avatar_url: 'https://example.com/avatar3.jpg',
                    email: 'alice.j@example.com',
                    verified: true,
                },
                reply_tweet: {
                    tweet_id: '423e4567-e89b-12d3-a456-426614174005',
                    content: 'Great point!',
                    num_likes: 5,
                    num_reposts: 1,
                    num_replies: 0,
                    num_quotes: 0,
                    created_at: '2025-11-29T08:45:00.000Z',
                },
                original_tweet: {
                    tweet_id: '523e4567-e89b-12d3-a456-426614174006',
                    content: 'What do you think about this?',
                    num_likes: 20,
                    num_reposts: 5,
                    num_replies: 3,
                    num_quotes: 1,
                    created_at: '2025-11-29T07:00:00.000Z',
                },
                conversation_id: '623e4567-e89b-12d3-a456-426614174007',
            },
            {
                type: 'repost',
                created_at: '2025-11-29T08:00:00.000Z',
                reposter: {
                    id: '723e4567-e89b-12d3-a456-426614174008',
                    name: 'Bob Williams',
                    username: 'bobw',
                    avatar_url: 'https://example.com/avatar4.jpg',
                    email: 'bob.w@example.com',
                    verified: false,
                },
                tweet: {
                    tweet_id: '823e4567-e89b-12d3-a456-426614174009',
                    content: 'Check out this amazing content!',
                    num_likes: 100,
                    num_reposts: 25,
                    num_replies: 12,
                    num_quotes: 5,
                    created_at: '2025-11-28T10:00:00.000Z',
                },
            },
            {
                type: 'quote',
                created_at: '2025-11-29T07:30:00.000Z',
                quoter: {
                    id: '923e4567-e89b-12d3-a456-426614174010',
                    name: 'Charlie Brown',
                    username: 'charlieb',
                    avatar_url: 'https://example.com/avatar5.jpg',
                    email: 'charlie.b@example.com',
                    verified: true,
                },
                quote_tweet: {
                    tweet_id: 'a23e4567-e89b-12d3-a456-426614174011',
                    content: 'This is exactly what I was thinking!',
                    num_likes: 30,
                    num_reposts: 8,
                    num_replies: 4,
                    num_quotes: 2,
                    created_at: '2025-11-29T07:30:00.000Z',
                },
                parent_tweet: {
                    tweet_id: 'b23e4567-e89b-12d3-a456-426614174012',
                    content: 'Here are my thoughts on the topic...',
                    num_likes: 50,
                    num_reposts: 10,
                    num_replies: 8,
                    num_quotes: 3,
                    created_at: '2025-11-29T06:00:00.000Z',
                },
            },
        ],
    })
    notifications: NotificationDto[];
}
