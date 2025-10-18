import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'Alyaa Ali',
    description: 'The display name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Software developer and tech enthusiast.',
    description: 'A short biography about the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    example: 'https://example.com/images/profile.jpg',
    description: 'URL of the user’s profile image',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiProperty({
    example: 'https://example.com/images/cover.jpg',
    description: 'URL of the user’s cover image',
    required: false,
  })
  @IsOptional()
  @IsString()
  cover_url?: string;

  @ApiProperty({
    example: 'Cairo, Egypt',
    description: 'The user’s location',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    example: '2003-05-14',
    description: 'User’s birth date in ISO 8601 format (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  birth_date?: string;
}
