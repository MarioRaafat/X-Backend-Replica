import { Tweet } from '../entities/tweet.entity';
import { TweetResponseDTO, TweetType } from '../dto/tweet-response.dto';
import { UserResponseDTO } from '../dto/user-response.dto';
import { User } from 'src/user/entities/user.entity';

interface ITweetWithTypeInfo extends Tweet {
    reply_info_original_tweet_id?: string;
    quote_info_original_tweet_id?: string;
    repost_info_original_tweet_id?: string;
    reposted_by_user?: User;
}

export class TweetMapper {
    static toDTO(tweet: Tweet, current_user_id?: string): TweetResponseDTO {
        const user_dto: UserResponseDTO = {
            id: tweet.user.id,
            username: tweet.user.username,
            name: tweet.user.name,
            avatar_url: tweet.user.avatar_url,
            verified: tweet.user.verified,
        };

        // Determine tweet type and parent_id based on loaded relationships
        const tweet_with_type = tweet as ITweetWithTypeInfo;
        let type: TweetType = 'tweet';
        let parent_tweet_id: string | undefined = undefined;

        if (tweet_with_type.reply_info_original_tweet_id) {
            type = 'reply';
            parent_tweet_id = tweet_with_type.reply_info_original_tweet_id;
        } else if (tweet_with_type.quote_info_original_tweet_id) {
            type = 'quote';
            parent_tweet_id = tweet_with_type.quote_info_original_tweet_id;
        } else if (tweet_with_type.repost_info_original_tweet_id) {
            type = 'repost';
            parent_tweet_id = tweet_with_type.repost_info_original_tweet_id;
        }

        return {
            tweet_id: tweet.tweet_id,
            type,
            parent_tweet_id,
            ...(tweet.conversation_id && { conversation_id: tweet.conversation_id }),
            content: tweet.content,
            images: tweet.images,
            videos: tweet.videos,
            likes_count: tweet.num_likes,
            reposts_count: tweet.num_reposts,
            views_count: tweet.num_views,
            quotes_count: tweet.num_quotes,
            replies_count: tweet.num_replies,
            is_liked: current_user_id
                ? (tweet.likes?.some((like) => like.user_id === current_user_id) ?? false)
                : false,
            is_reposted: current_user_id
                ? (tweet.reposts?.some((repost) => repost.user_id === current_user_id) ?? false)
                : false,
            created_at: tweet.created_at,
            updated_at: tweet.updated_at,
            user: user_dto,
        };
    }

    static toDTOList(tweets: Tweet[], current_user_id?: string): TweetResponseDTO[] {
        return tweets.map((tweet) => this.toDTO(tweet, current_user_id));
    }
}
