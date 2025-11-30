import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';

export class QuoteNotificationDto {
    @ApiProperty({
        description: 'Notification type',
        example: NotificationType.QUOTE,
        enum: NotificationType,
    })
    type: NotificationType.QUOTE;

    @ApiProperty({
        description: 'Timestamp when the notification was created',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;

    @ApiProperty({
        description: 'User who quoted your tweet',
        type: () => User,
    })
    quoter: User;

    @ApiProperty({
        description:
            'The quote tweet (new tweet with quoted content), includes parent_tweet nested inside',
        type: () => Tweet,
    })
    quote_tweet: Tweet & { parent_tweet: Tweet };
}
