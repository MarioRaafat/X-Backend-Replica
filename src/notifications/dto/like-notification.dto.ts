import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';

export class LikeNotificationDto {
    @ApiProperty({
        description: 'Notification type',
        example: NotificationType.LIKE,
        enum: NotificationType,
    })
    type: NotificationType.LIKE;

    @ApiProperty({
        description: 'Timestamp when the notification was created',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;

    @ApiProperty({
        description: 'User who liked your tweet',
        type: () => User,
    })
    liker: User;

    @ApiProperty({
        description: 'The tweet that was liked',
        type: () => Tweet,
    })
    tweet: Tweet;
}
