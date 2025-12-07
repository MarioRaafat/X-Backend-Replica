import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsNotEmpty, IsString, MaxLength, Validate } from 'class-validator';
import { AgeRangeValidator } from '../../validations/birth-date';
import { LARGE_MAX_LENGTH, NAME_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';

export class SignupStep1Dto {
    @ApiProperty({
        description: 'User name',
        example: 'Amira Alyaa',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(NAME_MAX_LENGTH)
    name: string;

    @ApiProperty({
        description: "Mario's birth date",
        example: '2004-05-22',
    })
    @IsNotEmpty()
    @IsDateString()
    @Validate(AgeRangeValidator, [6, 100])
    birth_date: string;

    @ApiProperty({
        description: 'User email',
        example: 'bahgot@gmail.com',
        format: 'email',
    })
    @IsEmail()
    @MaxLength(STRING_MAX_LENGTH)
    email: string;

    @ApiProperty({
        description: 'reCAPTCHA response token from frontend widget',
        example: '03AGdBq25SxXT-pmSeBXjzScW-EiocHwwpwqJRCAC...',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    captcha_token: string;
}
