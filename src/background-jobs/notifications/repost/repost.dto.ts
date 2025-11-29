import { Tweet } from 'src/tweets/entities';

export class RepostBackGroundNotificationJobDTO {
    tweet?: Tweet;
    tweet_id?: string;

    reposted_by: string;
    repost_to: string;

    action: 'add' | 'remove';
}
