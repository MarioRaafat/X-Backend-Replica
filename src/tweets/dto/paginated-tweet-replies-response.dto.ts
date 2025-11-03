import { ApiProperty } from '@nestjs/swagger';
import { TweetResponseDTO } from './tweet-response.dto';

export class PaginatedTweetRepliesResponseDTO {
    @ApiProperty({
        description: 'Array of reply tweets',
        type: [TweetResponseDTO],
    })
    data: TweetResponseDTO[];

    @ApiProperty({
        description: 'Total count of replies for this tweet',
        example: 25,
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
        description: 'Indicates if there are more replies available to fetch',
        example: true,
    })
    has_more: boolean;
}
