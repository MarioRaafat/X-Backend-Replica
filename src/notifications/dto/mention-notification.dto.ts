import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { TweetResponseDTO, UserResponseDTO } from 'src/tweets/dto';

export class MentionNotificationDto {
    @ApiProperty({
        description: 'Notification ID',
        example: 50,
        type: Number,
    })
    id: number;

    @ApiProperty({
        example: NotificationType.MENTION,
        enum: [NotificationType.MENTION],
        description: 'Type of notification',
    })
    type: NotificationType.MENTION;

    @ApiProperty({
        example: '2025-11-29T08:45:00.000Z',
        description: 'Timestamp when the notification was created',
    })
    created_at: Date;

    @ApiProperty({
        description: 'User who mentioned',
        type: UserResponseDTO,
    })
    mentioner: UserResponseDTO;

    @ApiProperty({
        description: 'Tweet containing the mention',
        type: TweetResponseDTO,
    })
    tweet: TweetResponseDTO;

    @ApiProperty({
        example: 'tweet',
        enum: ['tweet', 'quote', 'reply'],
        description: 'Type of the tweet (tweet, quote, or reply)',
    })
    tweet_type: 'tweet' | 'quote' | 'reply';
}
