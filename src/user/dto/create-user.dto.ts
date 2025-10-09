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
        description: 'Phone number (optional)',
        example: '+1234567890',
        required: false,
    })
    @IsOptional()
    @IsString()
    phone_number?: string;

    @ApiProperty({
        description: 'Avatar URL',
        example: 'https://avatars.githubusercontent.com/u/12345?v=4',
        required: false,
    })
    @IsOptional()
    @IsString()
    avatar_url?: string;

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