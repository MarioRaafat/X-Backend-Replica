import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { LARGE_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';

export class GetMessagesQueryDto {
    @ApiPropertyOptional({
        description: 'Number of messages to retrieve',
        default: 50,
        minimum: 1,
        maximum: 100,
        example: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;

    @ApiPropertyOptional({
        description: 'Get messages before this message ID (for loading older messages)',
        example: 'msg_456abc-789def-012ghi',
    })
    @IsOptional()
    @IsString()
    @IsUUID()
    before?: string;
}

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
