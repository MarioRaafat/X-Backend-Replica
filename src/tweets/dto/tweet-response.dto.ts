import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';

export class TweetResponseDTO {
    @ApiProperty({
        description: 'Tweet ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    tweet_id: string;

    @ApiProperty({
        description: 'Tweet content',
        example: 'This is my first tweet!',
    })
    content: string;

    @ApiProperty({
        description: 'Array of image URLs',
        example: ['https://example.com/image1.jpg'],
        type: [String],
    })
    images: string[];

    @ApiProperty({
        description: 'Array of video URLs',
        example: ['https://example.com/video1.mp4'],
        type: [String],
    })
    videos: string[];

    @ApiProperty({
        description: 'Parent tweet ID (if this is a reply or quote)',
        example: '550e8400-e29b-41d4-a716-446655440001',
        required: false,
    })
    parent_tweet_id?: string;

    @ApiProperty({
        description: 'Tweet author information',
        type: UserResponseDTO,
    })
    user: UserResponseDTO;

    @ApiProperty({
        description: 'Parent tweet (if this is a reply or quote)',
        type: () => TweetResponseDTO,
        required: false,
    })
    parent_tweet?: TweetResponseDTO;

    @ApiProperty({
        description: 'Number of likes',
        example: 42,
    })
    likes_count: number;

    @ApiProperty({
        description: 'Number of reposts',
        example: 15,
    })
    reposts_count: number;

    @ApiProperty({
        description: 'Number of quotes',
        example: 8,
    })
    quotes_count: number;

    @ApiProperty({
        description: 'Number of replies',
        example: 23,
    })
    replies_count: number;

    @ApiProperty({
        description: 'Whether the current user has liked this tweet',
        example: true,
    })
    is_liked: boolean;

    @ApiProperty({
        description: 'Whether the current user has reposted this tweet',
        example: false,
    })
    is_reposted: boolean;

    @ApiProperty({
        description: 'Tweet creation timestamp',
        example: '2025-10-18T12:00:00Z',
    })
    created_at: Date;

    @ApiProperty({
        description: 'Tweet last update timestamp',
        example: '2025-10-18T12:30:00Z',
    })
    updated_at: Date;
}
