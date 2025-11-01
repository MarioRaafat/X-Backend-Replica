import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDTO {
    @ApiProperty({
        description: 'User ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    id: string;

    @ApiProperty({
        description: 'Username',
        example: 'john_doe',
    })
    username: string;

    @ApiProperty({
        description: 'Display name',
        example: 'John Doe',
    })
    name: string;

    @ApiProperty({
        description: 'User avatar URL',
        example: 'https://example.com/avatar.jpg',
        required: false,
    })
    avatar_url?: string;

    @ApiProperty({
        description: 'Whether the user is verified',
        example: true,
    })
    verified: boolean;

    @ApiProperty({
        description: 'User bio/description',
        example: 'Software developer passionate about tech',
        required: false,
    })
    bio?: string;

    @ApiProperty({
        description: 'User cover image URL',
        example: 'https://example.com/cover.jpg',
        required: false,
    })
    cover_url?: string;

    @ApiProperty({
        description: 'Number of followers',
        example: 1250,
    })
    followers: number;

    @ApiProperty({
        description: 'Number of users following',
        example: 340,
    })
    following: number;

    @ApiProperty({
        description: 'Whether the current user is following this user',
        example: false,
        required: false,
    })
    is_following?: boolean;
}
