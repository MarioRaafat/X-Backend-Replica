import { ApiProperty } from '@nestjs/swagger';
import { TweetResponseDTO } from './tweet-response.dto';

export class BookmarksPaginationDTO {
    @ApiProperty({
        description: 'Total count of bookmarks in current response',
        example: 20,
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
        description: 'Indicates if there are more bookmarks available to fetch',
        example: true,
    })
    has_more: boolean;
}

export class PaginatedBookmarksResponseDTO {
    @ApiProperty({
        description: 'Array of bookmarked tweets',
        type: [TweetResponseDTO],
    })
    data: TweetResponseDTO[];

    @ApiProperty({
        description: 'Pagination information',
        type: BookmarksPaginationDTO,
    })
    pagination: BookmarksPaginationDTO;
}
