import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckIdentifierDto {
    @ApiProperty({
        description: 'The identifier to check (email, phone number, or username)',
        example: 'mariorafat10@gmail.com',
    })
    @IsString()
    @IsNotEmpty()
    identifier: string;
}
