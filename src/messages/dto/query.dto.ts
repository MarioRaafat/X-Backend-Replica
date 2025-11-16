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
