import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-types';
import { UserResponseDTO } from 'src/tweets/dto';

export class MessageNotificationDto {
    @ApiProperty({
        description: 'Notification ID',
        example: 50,
        type: Number,
    })
    id: number;

    @ApiProperty({
        example: NotificationType.MESSAGE,
        enum: [NotificationType.MESSAGE],
        description: 'Type of notification',
    })
    type: NotificationType.MESSAGE;

    @ApiProperty({
        example: '2025-11-29T08:45:00.000Z',
        description: 'Timestamp when the notification was created',
    })
    created_at: Date;

    @ApiProperty({
        description: 'User who sent the message',
        type: UserResponseDTO,
    })
    sender: UserResponseDTO;

    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'ID of the message',
    })
    message_id: string;

    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174001',
        description: 'ID of the chat',
    })
    chat_id: string;
}
