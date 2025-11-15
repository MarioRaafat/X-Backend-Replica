import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
    @ApiProperty({
        description: 'Email address to send the OTP to',
        example: 'mario0o0o@gmail.com',
        type: String,
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;
}
