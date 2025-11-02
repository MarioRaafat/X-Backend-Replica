import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

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
        description: 'Whether the current user is following this user',
        example: false,
        required: false,
    })
    is_following?: boolean;
}
