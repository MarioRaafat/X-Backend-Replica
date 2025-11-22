import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class UserResponseDTO {
    @Expose()
    @ApiProperty({
        description: 'User ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    id: string;

    @Expose()
    @ApiProperty({
        description: 'Username',
        example: 'john_doe',
    })
    username: string;

    @Expose()
    @ApiProperty({
        description: 'Display name',
        example: 'John Doe',
    })
    name: string;

    @Expose()
    @ApiProperty({
        description: 'User avatar URL',
        example: 'https://example.com/avatar.jpg',
        required: false,
    })
    avatar_url?: string;

    @Expose()
    @ApiProperty({
        description: 'Whether the user is verified',
        example: true,
    })
    verified: boolean;

    @Expose()
    @ApiProperty({
        description: 'User bio/description',
        example: 'Software developer passionate about tech',
        required: false,
    })
    bio?: string;

    @Expose()
    @ApiProperty({
        description: 'User cover image URL',
        example: 'https://example.com/cover.jpg',
        required: false,
    })
    cover_url?: string;

    @Expose()
    @ApiProperty({
        description: 'Number of followers',
        example: 1250,
    })
    followers: number;

    @Expose()
    @ApiProperty({
        description: 'Number of users following',
        example: 340,
    })
    following: number;

    @Expose()
    @ApiProperty({
        description: 'Whether the current user is following this user',
        example: false,
        required: false,
    })
    is_following?: boolean;

    @Expose()
    @ApiProperty({
        description: 'Whether the current user is followed by this user',
        example: false,
        required: false,
    })
    is_follower?: boolean;
}
