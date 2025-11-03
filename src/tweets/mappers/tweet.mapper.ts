import { Tweet } from '../entities/tweet.entity';
import { TweetResponseDTO, TweetType } from '../dto/tweet-response.dto';
import { UserResponseDTO } from '../dto/user-response.dto';

export class TweetMapper {
    static toDTO(
        tweet: Tweet,
        current_user_id?: string,
        is_reposted_view?: boolean,
        is_following?: boolean
    ): TweetResponseDTO {
        const user_dto: UserResponseDTO = {
            id: tweet.user.id,
            username: tweet.user.username,
            name: tweet.user.name,
            avatar_url: tweet.user.avatar_url,
            verified: tweet.user.verified,
            bio: tweet.user.bio,
            cover_url: tweet.user.cover_url,
            followers: tweet.user.followers,
            following: tweet.user.following,
            is_following,
        };

        // Determine tweet type based on loaded relationship data
        let type: TweetType = 'tweet';
        let parent_tweet_id: string | undefined = undefined;

        // If this tweet is being shown as a repost in timeline, mark it as repost
        if (is_reposted_view) {
            type = 'repost';
        }
        // Check if this tweet appears in reply_info (meaning it IS a reply)
        else if (tweet.reply_info && tweet.reply_info.length > 0) {
            type = 'reply';
            parent_tweet_id = tweet.reply_info[0].original_tweet_id;
        }
        // Check if this tweet appears in quote_info (meaning it IS a quote)
        else if (tweet.quote_info && tweet.quote_info.length > 0) {
            type = 'quote';
            parent_tweet_id = tweet.quote_info[0].original_tweet_id;
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

    static toDTOList(
        tweets: Tweet[],
        current_user_id?: string,
        following_map?: Map<string, boolean>
    ): TweetResponseDTO[] {
        return tweets.map((tweet) =>
            this.toDTO(
                tweet,
                current_user_id,
                false,
                following_map ? following_map.get(tweet.user.id) : undefined
            )
        );
    }
}
