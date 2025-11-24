export function getReplyWithParentChainQuery(current_user_id?: string) {
    return `
        WITH RECURSIVE reply_chain AS (
            SELECT 
                t.tweet_id,
                t.user_id,
                t.type,
                t.content,
                t.images,
                t.videos,
                t.num_likes,
                t.num_reposts,
                t.num_views,
                t.num_quotes,
                t.num_replies,
                t.created_at,
                t.updated_at,
                COALESCE(tr.original_tweet_id, tq.original_tweet_id) as parent_tweet_id,
                0 as depth
            FROM tweets t
            LEFT JOIN tweet_replies tr ON tr.reply_tweet_id = t.tweet_id
            LEFT JOIN tweet_quotes tq ON tq.quote_tweet_id = t.tweet_id
            WHERE t.tweet_id = $1
            
            UNION ALL
            
            SELECT 
                t.tweet_id,
                t.user_id,
                t.type,
                t.content,
                t.images,
                t.videos,
                t.num_likes,
                t.num_reposts,
                t.num_views,
                t.num_quotes,
                t.num_replies,
                t.created_at,
                t.updated_at,
                COALESCE(tr.original_tweet_id, tq.original_tweet_id) as parent_tweet_id,
                rc.depth + 1
            FROM tweets t
            INNER JOIN reply_chain rc ON t.tweet_id = rc.parent_tweet_id
            LEFT JOIN tweet_replies tr ON tr.reply_tweet_id = t.tweet_id
            LEFT JOIN tweet_quotes tq ON tq.quote_tweet_id = t.tweet_id
            WHERE rc.depth < 100
        )
        SELECT 
            rc.*,
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
            ) as user
            ${
                current_user_id
                    ? `,
                CASE WHEN likes.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_liked,
                CASE WHEN reposts.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_reposted,
                CASE WHEN follows.follower_id IS NOT NULL THEN TRUE ELSE FALSE END as is_following
            `
                    : ''
            }
        FROM reply_chain rc
        LEFT JOIN "user" u ON u.id = rc.user_id
        ${
            current_user_id
                ? `
            LEFT JOIN tweet_likes likes ON likes.tweet_id = rc.tweet_id AND likes.user_id = $2
            LEFT JOIN tweet_reposts reposts ON reposts.tweet_id = rc.tweet_id AND reposts.user_id = $2
            LEFT JOIN user_follows follows ON follows.follower_id = $2 AND follows.followed_id = u.id
        `
                : ''
        }
        ORDER BY rc.depth ASC
    `;
}
