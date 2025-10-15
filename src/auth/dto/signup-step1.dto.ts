import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SignupStep1Dto {
    @ApiProperty({
        description: 'User name',
        example: 'Amira Alyaa',
    })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({
        description: 'User birth date',
        example: '1990-01-01',
    })
    @IsNotEmpty()
    @IsString()
    birth_date: string;

    @ApiProperty({
        description: 'User email',
        example: 'bahgot@gmail.com',
        format: 'email',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'reCAPTCHA response token from frontend widget',
        example: '03AGdBq25SxXT-pmSeBXjzScW-EiocHwwpwqJRCAC...',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    captcha_token: string;
}
