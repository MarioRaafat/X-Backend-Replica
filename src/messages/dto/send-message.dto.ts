import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    Matches,
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

    @ApiPropertyOptional({
        description:
            'URL of the image attached to the message (obtained from image upload endpoint)',
        example:
            'https://yapperdev.blob.core.windows.net/message-images/user-123-1234567890-image.jpg',
    })
    @IsOptional()
    @IsString()
    @IsUrl()
    image_url?: string;

    @ApiPropertyOptional({
        description:
            'URL of the voice note attached to the message (obtained from voice upload endpoint)',
        example:
            'https://yapperdev.blob.core.windows.net/message-voices/user-123-1704067800-voice.mp3',
    })
    @IsOptional()
    @IsString()
    @IsUrl()
    voice_note_url?: string;

    @ApiPropertyOptional({
        description: 'Duration of the voice note in MM:SS format',
        example: '4:33',
        pattern: '^\\d{1,3}:\\d{2}$',
    })
    @IsOptional()
    @IsString()
    @Matches(/^\d{1,3}:\d{2}$/, {
        message: 'Duration must be in MM:SS format (e.g., "4:33")',
    })
    voice_note_duration?: string;
}
