import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { TimelinePaginationDto } from './timeline-pagination.dto';

export class MentionsDto extends TimelinePaginationDto {
  @ApiProperty({
    required: true,
    example: 'user123456789',
    description: 'User ID to get mentions for',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  // limit and cursor are inherited from TimelinePaginationDto
}