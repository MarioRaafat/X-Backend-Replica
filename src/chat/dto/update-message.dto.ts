import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMessageDto {
    @ApiProperty({
        description: 'Updated content of the message',
        example: 'I\'m doing amazing, thanks for asking!',
        minLength: 1,
        maxLength: 1000,
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    content: string;
}