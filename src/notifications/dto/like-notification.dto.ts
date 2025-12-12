import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { User } from 'src/user/entities';
import { Tweet } from 'src/tweets/entities';

export class LikeNotificationDto {
    @ApiProperty({
        description: 'Notification ID',
        example: 50,
        type: Number,
    })
    id: number;

    @ApiProperty({
        description: 'Notification type',
        example: NotificationType.LIKE,
        enum: NotificationType,
    })
    type: NotificationType.LIKE;

    @ApiProperty({
        description: 'Timestamp when the notification was created or last updated (aggregated)',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;

    @ApiProperty({
        description:
            'Users who liked your tweet(s). Multiple scenarios: ' +
            '1) Aggregation by tweet: Multiple people like the same tweet within 24h - all users shown. ' +
            '2) Aggregation by person: Same person likes multiple tweets within 24h - only that person shown. ' +
            'These two aggregation types do not mix in a single notification.',
        type: () => [User],
        isArray: true,
        example: [
            {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'john.doe@example.com',
                name: 'John Doe',
                username: 'johndoe',
                avatar_url: 'https://example.com/avatar.jpg',
            },
        ],
    })
    likers: User[];

    @ApiProperty({
        description:
            'The tweets that were liked. Multiple scenarios: ' +
            '1) Aggregation by tweet: Only contains one tweet that multiple people liked. ' +
            '2) Aggregation by person: Contains all tweets liked by the same person within 24h. ' +
            'These two aggregation types do not mix in a single notification.',
        type: () => [Tweet],
        isArray: true,
    })
    tweets: Tweet[];
}
