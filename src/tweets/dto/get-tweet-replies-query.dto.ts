import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTweetRepliesQueryDto {
    @ApiProperty({
        description:
            'Cursor for pagination. Format: timestamp_tweetId (e.g., "2025-10-23T12:00:00.000Z_uuid"). Use the next_cursor from the previous response.',
        example: '2025-10-23T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiProperty({
        description: 'Number of replies to return',
        example: 20,
        default: 20,
        minimum: 1,
        maximum: 100,
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;
}
