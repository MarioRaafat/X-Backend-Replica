import { ApiProperty } from '@nestjs/swagger';

export class TweetSummaryDto {
    @ApiProperty({
        description: 'Unique tweet identifier',
        example: '123e4567-e89b-12d3-a456-426614174001',
        type: String,
    })
    tweet_id: string;

    @ApiProperty({
        description: 'Tweet content text',
        example: 'This is an example tweet!',
        type: String,
        nullable: true,
    })
    content?: string | null;

    @ApiProperty({
        description: 'Number of likes on the tweet',
        example: 42,
        type: Number,
    })
    num_likes: number;

    @ApiProperty({
        description: 'Number of reposts',
        example: 15,
        type: Number,
    })
    num_reposts: number;

    @ApiProperty({
        description: 'Number of quotes',
        example: 5,
        type: Number,
    })
    num_quotes: number;

    @ApiProperty({
        description: 'Number of replies',
        example: 8,
        type: Number,
    })
    num_replies: number;

    @ApiProperty({
        description: 'Tweet creation timestamp',
        example: '2025-11-29T10:30:00.000Z',
        type: String,
    })
    created_at: Date;
}
