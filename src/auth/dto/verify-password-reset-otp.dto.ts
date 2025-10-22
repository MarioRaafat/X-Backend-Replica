import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyPasswordResetOtpDto {
    @ApiProperty({
        description: 'OTP token received in email for password reset',
        example: '123456',
        type: String,
        minLength: 6,
        maxLength: 6,
    })
    @IsString({ message: 'Token must be a string' })
    @IsNotEmpty({ message: 'Token is required' })
    @Length(6, 6, { message: 'Token must be exactly 6 characters' })
    token: string;
}
