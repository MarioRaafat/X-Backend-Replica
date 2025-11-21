import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CursorPaginationDto {
    @ApiProperty({
        description: 'Cursor for pagination (format: "timestamp_userId")',
        required: false,
        example: '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000',
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiProperty({
        description: 'Number of users to return per page',
        required: false,
        default: 20,
        minimum: 1,
        maximum: 100,
        example: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
