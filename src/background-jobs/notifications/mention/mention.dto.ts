import { Tweet } from 'src/tweets/entities';
import { TweetResponseDTO } from 'src/tweets/dto';

export class MentionBackGroundNotificationJobDTO {
    tweet?: Tweet;
    tweet_id?: string;

    parent_tweet?: TweetResponseDTO;

    mentioned_by: string;
    mentioned_usernames?: string[];

    tweet_type: 'tweet' | 'quote' | 'reply';

    action: 'add' | 'remove';
}
