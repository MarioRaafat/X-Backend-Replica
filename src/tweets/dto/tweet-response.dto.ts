import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';
import { RepostedByUserDTO } from './reposted-by-user.dto';
import { Expose, Transform, Type } from 'class-transformer';

export type TweetType = 'tweet' | 'reply' | 'quote' | 'repost';

export class TweetResponseDTO {
    @Expose()
    @ApiProperty({
        description: 'Tweet ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    tweet_id: string;

    @Expose()
    @ApiProperty({
        description: 'Tweet type: tweet (normal), reply, quote, or repost',
        example: 'tweet',
        enum: ['tweet', 'reply', 'quote', 'repost'],
    })
    type: TweetType;

    @Expose()
    @ApiProperty({
        description: 'Tweet content',
        example: 'This is my first tweet!',
    })
    content: string;

    @Expose()
    @ApiProperty({
        description: 'Array of image URLs',
        example: ['https://example.com/image1.jpg'],
        type: [String],
    })
    images: string[];

    @Expose()
    @ApiProperty({
        description: 'Array of video URLs',
        example: ['https://example.com/video1.mp4'],
        type: [String],
    })
    videos: string[];

    @Expose()
    @ApiProperty({
        description: 'Parent tweet ID (if this is a reply or quote)',
        example: '550e8400-e29b-41d4-a716-446655440001',
        required: false,
    })
    parent_tweet_id?: string;

    @Expose()
    @ApiProperty({
        description: 'Conversation ID - the root tweet that started this thread (only for replies)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    conversation_id?: string;

    @Expose()
    @Type(() => UserResponseDTO)
    @ApiProperty({
        description: 'Tweet author information',
        type: UserResponseDTO,
    })
    user: UserResponseDTO;

    @Expose()
    @ApiProperty({
        description: 'Parent tweet (if this is a reply or quote)',
        type: () => TweetResponseDTO,
        required: false,
    })
    parent_tweet?: TweetResponseDTO;

    @Expose()
    @Transform(({ obj }) => obj.num_likes)
    @ApiProperty({
        description: 'Number of likes',
        example: 42,
    })
    likes_count: number;

    @Expose()
    @Transform(({ obj }) => obj.num_reposts)
    @ApiProperty({
        description: 'Number of reposts',
        example: 15,
    })
    reposts_count: number;

    @Expose()
    @Transform(({ obj }) => obj.num_views)
    @ApiProperty({
        description: 'Number of views',
        example: 1250,
    })
    views_count: number;

    @Expose()
    @Transform(({ obj }) => obj.num_quotes)
    @ApiProperty({
        description: 'Number of quotes',
        example: 8,
    })
    quotes_count: number;

    @Expose()
    @Transform(({ obj }) => obj.num_replies)
    @ApiProperty({
        description: 'Number of replies',
        example: 23,
    })
    replies_count: number;

    @Expose()
    @ApiProperty({
        description: 'Whether the current user has liked this tweet',
        example: true,
    })
    is_liked: boolean;

    @Expose()
    @ApiProperty({
        description: 'Whether the current user has reposted this tweet',
        example: false,
    })
    is_reposted: boolean;

    @Expose()
    @ApiProperty({
        description:
            'User who reposted this tweet (only present when this appears in timeline as a repost)',
        type: RepostedByUserDTO,
        required: false,
    })
    reposted_by?: RepostedByUserDTO;

    @Expose()
    @ApiProperty({
        description: 'Tweet creation timestamp',
        example: '2025-10-18T12:00:00Z',
    })
    created_at: Date;

    @Expose()
    @ApiProperty({
        description: 'Tweet last update timestamp',
        example: '2025-10-18T12:30:00Z',
    })
    updated_at: Date;
}
