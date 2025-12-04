import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BasicQueryDto } from './basic-query.dto';
import { Type } from 'class-transformer';

export enum PeopleFilter {
    ANYONE = 'anyone',
    FOLLOWING = 'following',
}

export enum LocationFilter {
    ANYWHERE = 'anywhere',
    NEAR_YOU = 'near_you',
}

export class SearchQueryDto extends BasicQueryDto {
    @ApiPropertyOptional({
        description: 'Cursor for pagination (format: "timestamp_userId")',
        required: false,
        example: '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000',
    })
    @IsOptional()
    @IsString()
    cursor?: string | null;

    @ApiPropertyOptional({
        description: 'Number of items to return per page',
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
