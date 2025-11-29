import { TweetResponseDTO } from 'src/tweets/dto';
import { Tweet } from 'src/tweets/entities';

export class QuoteBackGroundNotificationJobDTO {
    quote_tweet?: Tweet;
    quote_tweet_id?: string;

    parent_tweet?: TweetResponseDTO;

    quoted_by: string;
    quote_to: string;

    action: 'add' | 'remove';
}
