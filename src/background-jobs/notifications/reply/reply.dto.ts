import { CreateTweetDTO } from 'src/tweets/dto';
import { Tweet } from 'src/tweets/entities';

export class ReplyBackGroundNotificationJobDTO {
    reply_tweet?: Tweet;
    reply_tweet_id?: string;

    original_tweet_id?: string;

    replied_by: string;
    reply_to: string;

    conversation_id?: string;

    action: 'add' | 'remove';
}
