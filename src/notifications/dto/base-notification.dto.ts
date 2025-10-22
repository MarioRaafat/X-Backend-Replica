import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';

export class BaseNotificationDto {
    @ApiProperty({
        description: 'Type of the notification (e.g., LIKE, COMMENT, FOLLOW)',
        example: NotificationType.LIKE,
        enum: NotificationType,
    })
    type: string;

    @ApiProperty({
        description: 'Creation timestamp of this notification',
        example: '2025-10-15T18:30:00.000Z',
        type: String,
        format: 'date-time',
    })
    created_at: string;

    @ApiProperty({
        description: 'List of trigger IDs associated with this notification (UUIDv4)',
        example: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'eac8b334-70b9-4de4-8019-3946eae8b1e5'],
        type: [String],
    })
    trigger_ids: string[];

    @ApiProperty({
        description: 'List of user IDs associated with this notification (UUIDv4)',
        example: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'eac8b334-70b9-4de4-8019-3946eae8b1e5'],
        type: [String],
    })
    user_ids: string[];

    @ApiProperty({
        description: 'Human-readable message for the notification',
        example: 'Ahmed and 3 others liked your post',
        type: String,
    })
    content: string;

    @ApiProperty({
        description: 'Flag to know whether notification is seen or not',
        example: false,
        type: Boolean,
    })
    seen: boolean = false;

    @ApiPropertyOptional({
        description: 'Message sent in case the trigger is a message from another user',
        example: 'Hello!',
        type: String,
    })
    chatMessage?: string;
}
