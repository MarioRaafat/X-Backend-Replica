import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MIN } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class TimelinePaginationDto {
    @ApiProperty({
        default: 20,

        example: 20,
        required: false,

        description: 'Return Specific Number of tweets',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiProperty({
        required: false,
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Cursor for pagination (use the last tweet_id from previous page)',
    })
    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    cursor?: string;

    @IsOptional()
    @ApiProperty({
        required: false,
        example: '1856019327451',
        description: 'Returns tweets newer than a specific tweet',
    })
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    since_id?: string;
}
