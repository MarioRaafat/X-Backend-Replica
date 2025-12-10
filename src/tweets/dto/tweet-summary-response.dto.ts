import { ApiProperty } from '@nestjs/swagger';

export class TweetSummaryResponseDTO {
    @ApiProperty({
        example: 'c4a328a6-8c51-41b7-927a-4aafd41482a7',
        description: 'UUID of the tweet',
    })
    tweet_id: string;

    @ApiProperty({
        example:
            'AI tools are advancing quickly, changing team workflows. The challenge is adapting to these changes without feeling overwhelmed.',
        description: 'AI-generated summary of the tweet',
    })
    summary: string;
}
