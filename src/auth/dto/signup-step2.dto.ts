import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class SignupStep2Dto {
    @ApiProperty({
        description: 'Email address that the OTP was sent to',
        example: 'bahgot@gmail.com',
        type: String,
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    @MaxLength(STRING_MAX_LENGTH)
    email: string;

    @ApiProperty({
        description: 'OTP token received in email',
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
