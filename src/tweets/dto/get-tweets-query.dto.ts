import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTweetsQueryDto {
    @ApiProperty({
        description: 'Filter tweets by user ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @IsOptional()
    @IsUUID()
    user_id?: string;

    @ApiProperty({
        description: 'Cursor for pagination (tweet ID to start from)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiProperty({
        description: 'Number of tweets to return',
        example: 20,
        default: 20,
        minimum: 1,
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;
}
