import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';

export class PaginatedTweetLikesResponseDTO {
    @ApiProperty({
        description: 'Array of users who liked the tweet',
        type: [UserResponseDTO],
    })
    data: UserResponseDTO[];

    @ApiProperty({
        description: 'Total number of likes on this tweet',
        example: 150,
    })
    count: number;

    @ApiProperty({
        description: 'Cursor for the next page (null if no more pages)',
        example: '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000',
        nullable: true,
    })
    next_cursor: string | null;

    @ApiProperty({
        description: 'Whether there are more likes to fetch',
        example: true,
    })
    has_more: boolean;

    @ApiProperty({
        description: 'Success message',
        example: 'Tweet likes retrieved successfully',
    })
    message: string;
}
