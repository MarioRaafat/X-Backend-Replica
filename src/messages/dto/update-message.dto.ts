import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { MESSAGE_CONTENT_LENGTH } from 'src/constants/variables';

export class UpdateMessageDto {
    @ApiProperty({
        description: 'Updated content of the message',
        example: "I'm doing amazing, thanks for asking!",
        minLength: 1,
        maxLength: 1000,
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(MESSAGE_CONTENT_LENGTH)
    content: string;
}
