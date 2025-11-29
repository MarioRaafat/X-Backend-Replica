import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';

export class RepostNotificationDto {
    @ApiProperty({
        description: 'Notification type',
        example: NotificationType.REPOST,
        enum: NotificationType,
    })
    type: NotificationType.REPOST;

    @ApiProperty({
        description: 'Timestamp when the notification was created',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;

    @ApiProperty({
        description: 'User who reposted your tweet',
        type: () => User,
    })
    reposter: User;

    @ApiProperty({
        description: 'The tweet that was reposted',
        type: () => Tweet,
    })
    tweet: Tweet;
}
