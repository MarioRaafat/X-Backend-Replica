import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgetPasswordDto {
    // email - username - phone_number
    @ApiProperty({
        description: 'User identifier which can be email, username, or phone number',
        example: 'mariorafat10@gmail.com',
    })
    @IsString()
    @IsNotEmpty()
    identifier: string;
}
