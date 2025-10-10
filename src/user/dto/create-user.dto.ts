import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({
        description: 'User email',
        example: 'shady@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'User password (optional for OAuth users)',
        example: 'Mario0o0o!#$@2252004',
        required: false,
    })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({
        description: 'First name',
        example: 'Alyaa',
    })
    @IsString()
    first_name: string;

    @ApiProperty({
        description: 'Last name',
        example: 'Amira',
    })
    @IsString()
    last_name: string;

    @ApiProperty({
        description: 'Username',
        example: 'mario2252004',
    })
    @IsString()
    username: string;

    @ApiProperty({
        description: 'Bio (optional)',
        example: 'Software developer',
        required: false,
    })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiProperty({
        description: 'Phone number (optional)',
        example: '+1234567890',
        required: false,
    })
    @IsOptional()
    @IsString()
    phone_number?: string;

    @ApiProperty({
        description: 'Avatar URL (optional)',
        example: 'https://i.postimg.cc/2j7H1htR/Y-Logo.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    avatar_url?: string;

    @ApiProperty({
        description: 'Cover URL (optional)',
        example: 'https://i.postimg.cc/2j7H1htR/Y-Logo.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    cover_url?: string;

    @ApiProperty({
        description: 'Birth date (not optional)',
        example: '1990-01-01',
        required: true,
    })
    @IsString()
    birth_date: Date;

    @ApiProperty({
        description: 'Facebook ID (for OAuth users)',
        example: '12345678',
        required: false,
    })
    @IsOptional()
    @IsString()
    facebook_id?: string;

    @ApiProperty({
        description: 'Google ID (for OAuth users)',
        example: '123455678',
        required: false,
    })
    @IsOptional()
    @IsString()
    google_id?: string;

    @ApiProperty({
        description: 'GitHub ID (for OAuth users)',
        example: '12345678',
        required: false,
    })
    @IsOptional()
    @IsString()
    github_id?: string;
}