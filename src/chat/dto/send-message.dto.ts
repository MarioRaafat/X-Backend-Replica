import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
    @ApiProperty({
        description: 'Content of the message',
        example: 'انا شامم ريحة نقاشة 🤮',
        minLength: 1,
        maxLength: 1000,
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    content: string;

    @ApiProperty({
        description: 'Type of the message',
        enum: MessageType,
        example: MessageType.TEXT,
        default: MessageType.TEXT,
    })
    @IsOptional()
    @IsEnum(MessageType)
    message_type?: MessageType = MessageType.TEXT;

    @ApiPropertyOptional({
        description: 'ID of the message being replied to (only for reply messages)',
        example: 'msg_789def-012abc-345ghi',
    })
    @IsOptional()
    @IsString()
    @IsUUID()
    reply_to_message_id?: string;
}
