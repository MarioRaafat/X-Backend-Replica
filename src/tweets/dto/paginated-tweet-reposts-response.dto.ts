import { ApiProperty } from '@nestjs/swagger';

class UserDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @ApiProperty({ example: 'johndoe' })
    username: string;

    @ApiProperty({ example: 'John Doe' })
    name: string;

    @ApiProperty({ example: 'https://example.com/avatar.jpg' })
    avatar_url: string;

    @ApiProperty({ example: true })
    verified: boolean;
}

export class PaginatedTweetRepostsResponseDTO {
    @ApiProperty({
        type: [UserDto],
        description: 'Array of users who reposted the tweet',
    })
    data: UserDto[];

    @ApiProperty({
        example: 150,
        description: 'Total number of reposts for this tweet',
    })
    count: number;

    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Cursor for the next page (user_id of the last user in this page)',
        nullable: true,
    })
    next_cursor: string | null;

    @ApiProperty({
        example: true,
        description: 'Whether there are more results available',
    })
    has_more: boolean;

    @ApiProperty({
        example: 'Users who reposted the tweet retrieved successfully',
        description: 'Response message',
    })
    message: string;
}
