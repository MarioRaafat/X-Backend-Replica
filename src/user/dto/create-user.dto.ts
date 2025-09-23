import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
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
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Amira',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Phone number (optional)',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'GitHub ID (for OAuth users)',
    example: '12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  githubId?: string;

  @ApiProperty({
    description: 'Authentication provider',
    example: 'local',
    default: 'local',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://avatars.githubusercontent.com/u/12345?v=4',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({
    description: 'Email verification status',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
  @ApiProperty({
    description: 'Facebook ID (for OAuth users)',
    example: '12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  facebookId?: string;

  @ApiProperty({
    description: 'Google ID (for OAuth users)',
    example: '123455678',
    required: false,
  })
  @IsOptional()
  @IsString()
  googleId?: string;
}
