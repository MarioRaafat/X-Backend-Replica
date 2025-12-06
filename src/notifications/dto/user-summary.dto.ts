import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
    @ApiProperty({
        description: 'Unique user identifier',
        example: '123e4567-e89b-12d3-a456-426614174000',
        type: String,
    })
    id: string;

    @ApiProperty({
        description: 'User display name',
        example: 'John Doe',
        type: String,
    })
    name: string;

    @ApiProperty({
        description: 'Unique username handle',
        example: 'johndoe',
        type: String,
    })
    username: string;

    @ApiProperty({
        description: 'User avatar URL',
        example: 'https://example.com/avatar.jpg',
        type: String,
        nullable: true,
    })
    avatar_url?: string | null;

    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
        type: String,
    })
    email: string;
}
