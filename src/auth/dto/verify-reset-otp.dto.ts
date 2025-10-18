import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyResetOtpDto {
    @ApiProperty({
        description: "The OTP code sent to the user's email",
        example: 'i2yf64z2',
        type: String,
    })
    @IsString({ message: 'Token must be a string' })
    @IsNotEmpty({ message: 'Token is required' })
    token: string;
}
