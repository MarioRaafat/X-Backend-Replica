import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTweetsQueryDto {
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
