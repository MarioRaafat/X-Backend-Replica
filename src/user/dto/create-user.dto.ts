import { IsEmail, IsOptional, IsString, MaxLength, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
    LARGE_MAX_LENGTH,
    NAME_MAX_LENGTH,
    STRING_MAX_LENGTH,
    USERNAME_MAX_LENGTH,
} from 'src/constants/variables';
import { AgeRangeValidator } from 'src/validations/birth-date';

export class CreateUserDto {
    @ApiProperty({
        description: 'User email',
        example: 'shady@example.com',
    })
    @IsEmail()
    @MaxLength(STRING_MAX_LENGTH)
    email: string;

    @ApiProperty({
        description: 'User password (optional for OAuth users)',
        example: 'Mario0o0o!#$@2252004',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    password?: string;

    @ApiProperty({
        description: 'Name',
        example: 'Alyaa Amira',
    })
    @IsString()
    @MaxLength(NAME_MAX_LENGTH)
    name: string;

    @ApiProperty({
        description: 'Username',
        example: 'mario2252004',
    })
    @IsString()
    @MaxLength(USERNAME_MAX_LENGTH)
    username: string;

    @ApiProperty({
        description: 'Bio (optional)',
        example: 'Software developer',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    bio?: string;

    @ApiProperty({
        description: 'Phone number (optional)',
        example: '+1234567890',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone_number?: string;

    @ApiProperty({
        description: 'Avatar URL (optional)',
        example: 'https://i.postimg.cc/2j7H1htR/Y-Logo.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    avatar_url?: string;

    @ApiProperty({
        description: 'Cover URL (optional)',
        example: 'https://i.postimg.cc/2j7H1htR/Y-Logo.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    cover_url?: string;

    @ApiProperty({
        description: 'Birth date (not optional)',
        example: '1990-01-01',
        required: true,
    })
    @IsString()
    @Validate(AgeRangeValidator, [6, 100])
    birth_date: Date;

    @ApiProperty({
        description: 'Facebook ID (for OAuth users)',
        example: '12345678',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    facebook_id?: string;

    @ApiProperty({
        description: 'Google ID (for OAuth users)',
        example: '123455678',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    google_id?: string;

    @ApiProperty({
        description: 'GitHub ID (for OAuth users)',
        example: '12345678',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    github_id?: string;

    @ApiProperty({
        description: 'FCM Token (optional)',
        example: 'fcm_token_example',
        required: false,
    })
    @IsOptional()
    @IsString()
    fcm_token?: string;
}
