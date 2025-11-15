import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, Validate } from 'class-validator';
import { LARGE_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';
import { AgeRangeValidator } from 'src/validations/birth-date';

export class UpdateUserDto {
    @ApiProperty({
        example: 'Alyaa Ali',
        description: 'The display name of the user',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    name?: string;

    @ApiProperty({
        example: 'Software developer and tech enthusiast.',
        description: 'A short biography about the user',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    bio?: string;

    @ApiProperty({
        example: 'https://example.com/images/profile.jpg',
        description: 'URL of the user’s profile image',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    avatar_url?: string;

    @ApiProperty({
        example: 'https://example.com/images/cover.jpg',
        description: 'URL of the user’s cover image',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    cover_url?: string;

    @ApiProperty({
        example: 'Cairo, Egypt',
        description: 'The user’s location',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    location?: string;

    @ApiProperty({
        example: '2003-05-14',
        description: 'User’s birth date in ISO 8601 format (YYYY-MM-DD)',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    @Validate(AgeRangeValidator, [6, 100])
    birth_date?: string;
}
