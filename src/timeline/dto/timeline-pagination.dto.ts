import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min, MIN } from 'class-validator';

export class TimelinePaginationDto {
    @ApiProperty({
        default: 50,

        example: 50,
        required: false,

        description: 'Return Specific Number of tweets',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiProperty({
        required: false,
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Cursor for pagination (use the last tweet_id from previous page)',
    })
    @IsOptional()
    cursor?: string | null;
    @IsOptional()
    @ApiProperty({
        required: false,
        example: '1856019327451',
        description: 'Returns tweets newer than a specific tweet',
    })
    since_id?: string;
}
