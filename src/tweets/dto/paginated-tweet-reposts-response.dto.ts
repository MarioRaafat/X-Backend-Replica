import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';
import { Expose, Type } from 'class-transformer';

export class PaginatedTweetRepostsResponseDTO {
    @Expose()
    @ApiProperty({
        type: [UserResponseDTO],
        description: 'Array of users who reposted the tweet',
    })
    @Type(() => UserResponseDTO)
    data: UserResponseDTO[];

    @Expose()
    @ApiProperty({
        example: true,
        description: 'Whether there are more results available',
    })
    has_more: boolean;

    @Expose()
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Cursor for the next page (user_id of the last user in this page)',
        nullable: true,
    })
    next_cursor: string | null;
}
