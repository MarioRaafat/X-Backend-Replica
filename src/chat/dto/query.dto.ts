import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { LARGE_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';

export class GetChatsQueryDto {
    @ApiPropertyOptional({
        description: 'Number of chats to retrieve',
        default: 20,
        minimum: 1,
        maximum: 50,
        example: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 20;

    @ApiPropertyOptional({
        description:
            "Cursor for pagination (It's from the last call to getChats, if it's the first call, leave it)",
    })
    @IsOptional()
    @IsString()
    cursor?: string;
}

export class SearchChatsQueryDto {
    @ApiPropertyOptional({
        description: 'Search query for recipient name or username',
        example: 'Mariooo0oo0o',
        minLength: 1,
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    query?: string;

    @ApiPropertyOptional({
        description: 'Number of chats to retrieve',
        default: 20,
        minimum: 1,
        maximum: 50,
        example: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Number of chats to skip for pagination',
        default: 0,
        minimum: 0,
        example: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;
}
