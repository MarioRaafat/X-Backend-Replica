import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';
import { RepostedByUserDTO } from './reposted-by-user.dto';
import { Expose, Transform, Type } from 'class-transformer';
import { TweetType } from 'src/shared/enums/tweet-types.enum';

export class TweetResponseDTO {
    @Expose()
    @ApiProperty({
        description: 'Tweet ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    tweet_id: string;
    //will be removed just for now to debug trending scores
    @Expose()
    @ApiProperty({
        description: 'Trending Score (Debug)',
        example: 123.45,
        required: false,
    })
    score?: number;

    @Expose()
    @ApiProperty({
        description: 'Tweet type: tweet (normal), reply, quote, or repost',
        example: 'tweet',
        enum: TweetType,
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
    @Type(() => UserResponseDTO)
    @ApiProperty({
        description: 'Tweet author information',
        type: UserResponseDTO,
    })
    user: UserResponseDTO;

    @Expose()
    @Type(() => TweetResponseDTO)
    @ApiProperty({
        description: 'Parent tweet (if this is a reply or quote)',
        type: () => TweetResponseDTO,
        required: false,
    })
    parent_tweet?: TweetResponseDTO;

    @Expose()
    @Type(() => TweetResponseDTO)
    @ApiProperty({
        description: 'Main Conversation tweet (if this is a reply)',
        type: () => TweetResponseDTO,
        required: false,
    })
    conversation_tweet?: TweetResponseDTO;

    @Expose()
    @Type(() => TweetResponseDTO)
    @ApiProperty({
        description: 'Limited number of replies to this tweet',
        type: [TweetResponseDTO],
        required: false,
    })
    replies?: TweetResponseDTO[];

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
    @Transform(({ obj }) => obj.num_bookmarks)
    @ApiProperty({
        description: 'Number of bookmarks',
        example: 15,
    })
    bookmarks_count?: number = 0;

    @Expose()
    @Transform(({ obj }) => !!obj.current_user_like || obj.is_liked)
    @ApiProperty({
        description: 'Whether the current user has liked this tweet',
        example: true,
    })
    is_liked?: boolean = false;

    @Expose()
    @Transform(({ obj }) => !!obj.current_user_repost || obj.is_reposted)
    @ApiProperty({
        description: 'Whether the current user has reposted this tweet',
        example: false,
    })
    is_reposted?: boolean = false;

    @Expose()
    @Transform(({ obj }) => !!obj.current_user_bookmark)
    @ApiProperty({
        description: 'Whether the current user has bookmarked this tweet',
        example: false,
    })
    is_bookmarked?: boolean = false;

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
