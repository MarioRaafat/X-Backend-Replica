import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { User } from 'src/user/entities';

export class FollowNotificationDto {
    @ApiProperty({
        description: 'Notification ID',
        example: '507f1f77bcf86cd799439011',
        type: String,
    })
    id: string;

    @ApiProperty({
        description: 'Notification type',
        example: NotificationType.FOLLOW,
        enum: NotificationType,
    })
    type: NotificationType.FOLLOW;

    @ApiProperty({
        description: 'Timestamp when the notification was created',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;

    @ApiProperty({
        description: 'Users who followed you',
        type: () => [User],
        isArray: true,
    })
    followers: User[];
}
