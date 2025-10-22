import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyUpdateEmailDto {
    @ApiProperty({
        description: 'New email address being verified',
        example: 'newemail@example.com',
        type: String,
    })
    @IsEmail()
    @IsNotEmpty()
    new_email: string;

    @ApiProperty({
        description: 'OTP code sent to the new email',
        example: '123456',
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    otp: string;
}
