import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDTO } from './user-response.dto';

export class TweetLikesResponseDTO {
    @ApiProperty({
        description: 'Array of users who liked the tweet',
        type: [UserResponseDTO],
    })
    users: UserResponseDTO[];

    @ApiProperty({
        description: 'Total number of likes',
        example: 42,
    })
    total_count: number;
}
