import { ApiProperty } from '@nestjs/swagger';
import { TweetResponseDTO } from './tweet-response.dto';

export class TweetsListResponseDTO {
    @ApiProperty({
        description: 'Array of tweets',
        type: [TweetResponseDTO],
    })
    tweets: TweetResponseDTO[];

    @ApiProperty({
        description: 'Cursor for next page (last tweet ID)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    next_cursor?: string;

    @ApiProperty({
        description: 'Whether there are more tweets to load',
        example: true,
    })
    has_more: boolean;

    @ApiProperty({
        description: 'Total count of tweets',
        example: 150,
    })
    total_count: number;
}
