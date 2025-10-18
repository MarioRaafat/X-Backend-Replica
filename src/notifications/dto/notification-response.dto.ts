// src/notifications/dto/notifications-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { BaseNotificationDto } from './base-notification.dto';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'The user ID this notification list belongs to',
    example: '66f72f92c9b3f4a8f7b7d8b1',
    type: String,
  })
  user: string;

  @ApiProperty({
    description: 'Array of the most recent notifications (max 50)',
    type: [BaseNotificationDto],
  })
  notifications: BaseNotificationDto[];

  @ApiProperty({
    description: 'Current page number (starting from 1)',
    type: Number,
    example: 1,
  })
  page_offset: number;

  @ApiProperty({
    description: 'Maximum number of notifications returned per page',
    type: Number,
    example: 10,
  })
  page_size: number;

  @ApiProperty({
    description: 'Total number of notifications available for this user',
    type: Number,
    example: 47,
  })
  total: number;
}
