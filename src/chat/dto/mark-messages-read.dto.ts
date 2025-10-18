import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class MarkMessagesReadDto {
    @ApiPropertyOptional({
        description: 'ID of the last message to mark as read. If not provided, all messages in chat will be marked as read',
        example: 'msg_456abc-789def-012ghi',
    })
    @IsOptional()
    @IsString()
    @IsUUID()
    last_read_message_id?: string;
}