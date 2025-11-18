import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';
import { Expose, Type } from 'class-transformer';

export class PaginatedTweetLikesResponseDTO {
    @Expose()
    @ApiProperty({
        description: 'Array of users who liked the tweet',
        type: [UserResponseDTO],
    })
    @Type(() => UserResponseDTO)
    data: UserResponseDTO[];

    @ApiProperty({
        example: true,
        description: 'Whether there are more results available',
    })
    has_more: boolean;

    @Expose()
    @ApiProperty({
        description: 'Cursor for the next page (null if no more pages)',
        example: '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000',
        nullable: true,
    })
    next_cursor: string | null;
}
