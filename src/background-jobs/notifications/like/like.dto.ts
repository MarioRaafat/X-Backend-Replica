import { CreateTweetDTO } from 'src/tweets/dto';
import { Tweet } from 'src/tweets/entities';

export class LikeBackGroundNotificationJobDTO {
    tweet: Tweet;
    liked_by: string;
    like_to: string;
}
