import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

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

    @ApiProperty({
        description:
            'User identifier (email or username) associated with the password reset request',
        example: 'lionel_messi10@gmail.com',
    })
    @IsString({ message: 'Identifier must be a string' })
    @IsNotEmpty({ message: 'Identifier is required' })
    @MaxLength(STRING_MAX_LENGTH)
    identifier: string;
}
