import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateChatDto {
    @ApiProperty({
        description: 'ID of the user to start chat with',
        example: 'user_456def-789abc-012ghi',
    })
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    recipient_id: string;
}