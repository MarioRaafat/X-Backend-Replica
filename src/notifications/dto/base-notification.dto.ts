import { ApiProperty } from '@nestjs/swagger';

export class BaseNotificationDto {
  @ApiProperty({
    description: 'Type of the notification (e.g., LIKE, COMMENT, FOLLOW)',
    example: 'LIKE',
  })
  type: string;

  @ApiProperty({
    description: 'Creation timestamp of this notification',
    example: '2025-10-15T18:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'List of trigger IDs associated with this notification (UUIDv4)',
    example: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'eac8b334-70b9-4de4-8019-3946eae8b1e5'],
    type: [String],
  })
  triggerIds: string[];

  @ApiProperty({
    description: 'Human-readable message for the notification',
    example: 'Ahmed and 3 others liked your post',
  })
  message: string;
}