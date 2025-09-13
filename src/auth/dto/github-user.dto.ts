import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GitHubUserDto {
  @ApiProperty({
    description: 'GitHub user ID',
    example: '12345678'
  })
  @IsString()
  githubId: string;

  @ApiProperty({
    description: 'User email from GitHub',
    example: 'shady@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'First name from GitHub profile',
    example: 'Mario'
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name from GitHub profile',
    example: 'Raafat'
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'GitHub avatar URL',
    example: 'https://avatars.githubusercontent.com/u/12345?v=4',
    required: false
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
