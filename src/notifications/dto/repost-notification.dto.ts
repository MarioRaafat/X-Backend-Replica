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
        description: 'Timestamp when the notification was created or last updated (aggregated)',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;

    @ApiProperty({
        description:
            'Users who reposted your tweet(s). Multiple scenarios: ' +
            '1) Aggregation by tweet: Multiple people repost the same tweet within 24h - all users shown. ' +
            '2) Aggregation by person: Same person reposts multiple tweets within 24h - only that person shown. ' +
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
    reposters: User[];

    @ApiProperty({
        description:
            'The tweets that were reposted. Multiple scenarios: ' +
            '1) Aggregation by tweet: Only contains one tweet that multiple people reposted. ' +
            '2) Aggregation by person: Contains all tweets reposted by the same person within 24h. ' +
            'These two aggregation types do not mix in a single notification.',
        type: () => [Tweet],
        isArray: true,
    })
    tweets: Tweet[];
}
