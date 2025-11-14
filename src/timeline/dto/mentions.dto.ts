import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TimelinePaginationDto } from './timeline-pagination.dto';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class MentionsDto extends TimelinePaginationDto {
    @ApiProperty({
        required: true,
        example: 'user123456789',
        description: 'User ID to get mentions for',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    user_id: string;

    // limit and cursor are inherited from TimelinePaginationDto
}
