import { Expose, Type } from 'class-transformer';
import { TweetResponseDTO } from './tweet-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TweetReplyResponseDTO extends TweetResponseDTO {
    @Expose()
    @ApiProperty({
        description: 'Conversation ID - the root tweet that started this thread (only for replies)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    conversation_id?: string;

    // @Expose()
    // @ApiProperty({
    //     description: 'Replied tweet information',
    //     type: () => TweetResponseDTO,
    // })
    // @Type(() => TweetResponseDTO)
    // reply_tweet: TweetResponseDTO;
}
