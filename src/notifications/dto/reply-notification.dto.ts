import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';

export class ReplyNotificationDto {
    @ApiProperty({
        description: 'Notification ID',
        example: 50,
        type: Number,
    })
    id: number;

    @ApiProperty({
        description: 'Notification type',
        example: NotificationType.REPLY,
        enum: NotificationType,
    })
    type: NotificationType.REPLY;

    @ApiProperty({
        description: 'Timestamp when the notification was created',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;

    @ApiProperty({
        description: 'User who replied to your tweet',
        type: () => User,
    })
    replier: User;

    @ApiProperty({
        description: 'The reply tweet',
        type: () => Tweet,
    })
    reply_tweet: Tweet;

    @ApiProperty({
        description: 'Your original tweet that was replied to',
        type: () => Tweet,
    })
    original_tweet: Tweet;

    @ApiProperty({
        description: 'Conversation ID for the reply thread',
        example: '123e4567-e89b-12d3-a456-426614174002',
        type: String,
        nullable: true,
    })
    conversation_id?: string;
}
