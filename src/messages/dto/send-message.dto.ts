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
import { MESSAGE_CONTENT_LENGTH } from 'src/constants/variables';

export class SendMessageDto {
    @ApiProperty({
        description: 'Content of the message',
        example: 'انا شامم ريحة نقاشة 🤮',
        minLength: 1,
        maxLength: MESSAGE_CONTENT_LENGTH,
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(MESSAGE_CONTENT_LENGTH)
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
        description: 'Indicates if this is the first message in the conversation',
        example: false,
    })
    @IsOptional()
    is_first_message?: boolean;

    @ApiPropertyOptional({
        description: 'ID of the message being replied to (only for reply messages)',
        example: 'msg_789def-012abc-345ghi',
    })
    @IsOptional()
    @IsString()
    @IsUUID()
    reply_to_message_id?: string;
}
