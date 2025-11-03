import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class VerifyUpdateEmailDto {
    @ApiProperty({
        description: 'New email address being verified',
        example: 'mariorafat10@gmail.com',
        type: String,
    })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    new_email: string;

    @ApiProperty({
        description: 'OTP code sent to the new email',
        example: '123456',
        type: String,
    })
    @IsString({ message: 'Token must be a string' })
    @IsNotEmpty({ message: 'Token is required' })
    @Length(6, 6, { message: 'Token must be exactly 6 characters' })
    otp: string;
}
