import { JoinColumn, ManyToOne, ViewColumn, ViewEntity } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TweetLike } from './tweet-like.entity';
import { TweetRepost } from './tweet-repost.entity';
import { UserFollows } from '../../user/entities/user-follows.entity';

@ViewEntity({
    name: 'user_posts_view',
    materialized: false,
    expression: `
        SELECT 
            t.tweet_id::text AS id,
            t.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            t.tweet_id,
            NULL::uuid AS repost_id,
            t.type::text AS post_type,
            t.created_at AS post_date,
            t.type::text AS type,
            t.content,
            t.images,
            t.videos,
            t.num_likes,
            t.num_reposts,
            t.num_views,
            t.num_quotes,
            t.num_replies,
            t.num_bookmarks,
            t.mentions,
            t.created_at,
            t.updated_at,
            u.username,
            u.name,
            u.followers,
            u.following,
            u.avatar_url,
            u.cover_url,
            u.verified,
            u.bio,
            NULL::text AS reposted_by_name,
            NULL::text AS reposted_by_username,
            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,
            trep.conversation_id AS conversation_id,
            conv_tweet.user_id AS conversation_user_id,
            COALESCE(orig_quote_tweet.user_id, orig_reply_tweet.user_id) AS parent_user_id
        FROM tweets t
        INNER JOIN "user" u ON t.user_id = u.id
        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id
        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id
        LEFT JOIN tweets conv_tweet ON trep.conversation_id = conv_tweet.tweet_id
        LEFT JOIN tweets orig_quote_tweet ON tq.original_tweet_id = orig_quote_tweet.tweet_id
        LEFT JOIN tweets orig_reply_tweet ON trep.original_tweet_id = orig_reply_tweet.tweet_id
        
        UNION ALL
        
        SELECT 
            (tr.tweet_id::text || '_' || tr.user_id::text) AS id,
            tr.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            tr.tweet_id,
            tr.tweet_id AS repost_id,
            t.type::text AS post_type,
            tr.created_at AS post_date,
            'repost' AS type,
            t.content,
            t.images,
            t.videos,
            t.num_likes,
            t.num_reposts,
            t.num_views,
            t.num_quotes,
            t.num_replies,
            t.num_bookmarks,
            t.mentions,
            t.created_at,
            t.updated_at,
            u.username,
            u.name,
            u.followers,
            u.following,
            u.avatar_url,
            u.cover_url,
            u.verified,
            u.bio,
            reposter.name AS reposted_by_name,
            reposter.username AS reposted_by_username,
            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,
            trep.conversation_id AS conversation_id,
            conv_tweet.user_id AS conversation_user_id,
            COALESCE(orig_quote_tweet.user_id, orig_reply_tweet.user_id) AS parent_user_id

        FROM tweet_reposts tr
        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id
        INNER JOIN "user" u ON t.user_id = u.id
        INNER JOIN "user" reposter ON tr.user_id = reposter.id
        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id
        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id
        LEFT JOIN tweets conv_tweet ON trep.conversation_id = conv_tweet.tweet_id
        LEFT JOIN tweets orig_quote_tweet ON tq.original_tweet_id = orig_quote_tweet.tweet_id
        LEFT JOIN tweets orig_reply_tweet ON trep.original_tweet_id = orig_reply_tweet.tweet_id
    `,
})
export class UserPostsView {
    @ViewColumn()
    id: string;

    @ViewColumn()
    profile_user_id: string; // The user whose profile we're viewing

    @ViewColumn()
    tweet_author_id: string; // The original tweet author

    @ViewColumn()
    tweet_id: string;

    @ViewColumn()
    repost_id: string | null;

    @ViewColumn()
    post_type: 'tweet' | 'repost';

    @ViewColumn()
    post_date: Date;

    @ViewColumn()
    type: string;

    @ViewColumn()
    content: string;

    @ViewColumn({ name: 'images' })
    images: string[];

    @ViewColumn({ name: 'videos' })
    videos: string[];

    @ViewColumn()
    num_likes: number;

    @ViewColumn()
    num_reposts: number;

    @ViewColumn()
    num_views: number;

    @ViewColumn()
    num_quotes: number;

    @ViewColumn()
    num_replies: number;

    @ViewColumn()
    num_bookmarks: number;

    @ViewColumn()
    mentions: string[];

    @ViewColumn()
    created_at: Date;

    @ViewColumn()
    updated_at: Date;

    @ViewColumn()
    username: string;

    @ViewColumn()
    name: string;

    @ViewColumn()
    followers: number;

    @ViewColumn()
    following: number;

    @ViewColumn()
    avatar_url: string;

    @ViewColumn()
    cover_url: string;

    @ViewColumn()
    verified: boolean;

    @ViewColumn()
    bio: string;

    @ViewColumn()
    reposted_by_name: string | null;

    @ViewColumn()
    reposted_by_username: string | null;

    @ViewColumn()
    parent_id: string | null;

    @ViewColumn()
    conversation_id: string | null;

    @ViewColumn()
    conversation_user_id: string | null;

    @ViewColumn()
    parent_user_id: string | null;

    // Virtual relations for joins (tweet author)
    @ManyToOne(() => User)
    @JoinColumn({ name: 'tweet_author_id' })
    user?: User;

    // Reposted by user (only for reposts)
    reposted_by_user?: User;

    // Virtual properties for interaction flags
    current_user_like?: TweetLike | null;
    current_user_repost?: TweetRepost | null;
    current_user_follows?: UserFollows | null;

    is_liked?: boolean;
    is_reposted?: boolean;
    is_following?: boolean;
    is_follower?: boolean;
}
