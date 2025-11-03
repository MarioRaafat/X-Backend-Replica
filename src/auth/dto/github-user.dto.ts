import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class GitHubUserDto {
    @ApiProperty({
        description: 'GitHub user ID',
        example: '12345678',
    })
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    github_id: string;

    @ApiProperty({
        description: 'User email from GitHub',
        example: 'shady@example.com',
    })
    @IsEmail()
    @MaxLength(STRING_MAX_LENGTH)
    email: string;

    @ApiProperty({
        description: 'First name from GitHub profile',
        example: 'Mario',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    first_name: string;

    @ApiProperty({
        description: 'Last name from GitHub profile',
        example: 'Raafat',
    })
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    last_name: string;

    @ApiProperty({
        description: 'GitHub avatar URL',
        example: 'https://avatars.githubusercontent.com/u/12345?v=4',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    avatar_url?: string;
}
