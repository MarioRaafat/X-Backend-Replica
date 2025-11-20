import { TweetResponseDTO } from '../dto/tweet-response.dto';

export function getFollowingTweetsQuery(cursor_condition: string, limit: number = 10): string {
    return `  SELECT 
            post.*,
            json_build_object(
                'id', u.id,
                'username', u.username,
                'name', u.name,
                'avatar_url', u.avatar_url,
                'verified', u.verified,
                'bio', u.bio,
                'cover_url', u.cover_url,
                'followers', u.followers,
                'following', u.following
            ) as user,
            CASE 
                WHEN post.post_type = 'repost' THEN json_build_object(
                    'id', reposted_by.id,
                    'name', reposted_by.name
                )
                ELSE NULL
            END as reposted_by_user,
            --TODO: It cannot be null?
            COALESCE(post.type, 'tweet') as tweet_type,

            -- Get parent_id if it is a quote or reply
            -- Get parent data if it is a quote
            -- TODO: Reply 
            
            CASE WHEN likes.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_liked,
            CASE WHEN reposts.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_reposted,
            CASE WHEN follows.follower_id IS NOT NULL THEN TRUE ELSE FALSE END as is_following


             FROM user_posts_view post
        LEFT JOIN "user" u ON u.id = post.tweet_author_id
        LEFT JOIN "user" reposted_by 
            ON reposted_by.id = post.profile_user_id 
            AND post.post_type = 'repost'

        LEFT JOIN tweet_likes likes 
            ON likes.tweet_id = post.tweet_id 
            AND likes.user_id = $1

        LEFT JOIN tweet_reposts reposts 
            ON reposts.tweet_id = post.tweet_id 
            AND reposts.user_id = $1

        LEFT JOIN user_follows follows 
            ON follows.follower_id = $1 
            AND follows.followed_id = post.tweet_author_id

        WHERE (
            post.tweet_author_id = $1 
            OR post.tweet_author_id IN (
                SELECT followed_id FROM user_follows WHERE follower_id = $1
            )
            OR post.profile_user_id = $1 
            OR post.profile_user_id IN (
                SELECT followed_id FROM user_follows WHERE follower_id = $1
            )
        )
        AND post.tweet_author_id NOT IN (
            SELECT muted_id FROM user_mutes WHERE muter_id = $1
        )
        AND post.profile_user_id NOT IN (
            SELECT muted_id FROM user_mutes WHERE muter_id = $1
        )
            ${cursor_condition}
            ORDER BY post.created_at
            LIMIT ${limit}
            
            `;
}
