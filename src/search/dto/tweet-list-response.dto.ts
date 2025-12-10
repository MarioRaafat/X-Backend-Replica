import { TweetResponseDTO } from 'src/tweets/dto';

export class TweetListResponseDto {
    data: TweetResponseDTO[];
    pagination: {
        next_cursor: string | null;
        has_more: boolean;
    };
}
