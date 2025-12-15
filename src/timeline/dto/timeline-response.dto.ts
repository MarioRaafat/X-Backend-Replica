import { ApiProperty } from '@nestjs/swagger';
import { TweetResponseDTO } from 'src/tweets/dto';

export class TimelineResponseDto {
    @ApiProperty({
        type: [TweetResponseDTO],
        description: 'List of tweets in timeline',
    })
    tweets: TweetResponseDTO[];
    @ApiProperty({
        description: 'Cursor for next page (last tweet ID)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    next_cursor?: string | null;

    @ApiProperty({
        description: 'Whether there are more tweets to load',
        example: true,
    })
    has_more: boolean;

    @ApiProperty({
        description: 'Total tweets count',
        example: 100,
    })
    count: number;

    @ApiProperty({
        example: '2024-01-15T10:35:00Z',
        description: 'Feed was fetched/generated at 10:35',
    })
    timestamp: string;
}
