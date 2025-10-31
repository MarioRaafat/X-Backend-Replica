import { ApiProperty } from '@nestjs/swagger';

export class PaginatedTweetsResponseDTO {
    @ApiProperty({
        description: 'Array of tweets',
        example: [],
    })
    data: any[];

    @ApiProperty({
        description: 'Total count of tweets matching the query',
        example: 100,
    })
    count: number;

    @ApiProperty({
        description:
            'Cursor for the next page. Format: timestamp_tweetId. Pass this as the cursor parameter for the next request.',
        example: '2025-10-23T11:59:00.000Z_550e8400-e29b-41d4-a716-446655440001',
        nullable: true,
    })
    next_cursor: string | null;

    @ApiProperty({
        description: 'Indicates if there are more tweets available to fetch',
        example: true,
    })
    has_more: boolean;

    @ApiProperty({
        description: 'Success message',
        example: 'Tweets retrieved successfully',
    })
    message: string;
}
