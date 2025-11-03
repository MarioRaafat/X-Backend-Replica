import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class SignupStep3Dto {
    @ApiProperty({
        description: 'Email address',
        example: 'bahgot@gmail.com',
        type: String,
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    @MaxLength(STRING_MAX_LENGTH)
    email: string;

    @ApiProperty({
        description:
            'User password - must contain at least one uppercase letter, one lowercase letter, and one number or special character',
        example: 'Mario0o0o!#$@2252004',
        minLength: 8,
    })
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    })
    @MaxLength(STRING_MAX_LENGTH)
    password: string;

    @ApiProperty({
        description: 'User username',
        example: 'amira_alyaa_123',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    username: string;

    @ApiProperty({
        description: 'User preferred language',
        example: 'en',
        enum: ['en', 'ar'],
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2)
    @IsIn(['en', 'ar'], { message: 'Language must be either en or ar' })
    language?: string;
}
