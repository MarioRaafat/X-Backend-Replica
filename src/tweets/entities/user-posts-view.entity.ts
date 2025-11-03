import { JoinColumn, ManyToOne, ViewColumn, ViewEntity } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TweetLike } from './tweet-like.entity';
import { TweetRepost } from './tweet-repost.entity';
import { UserFollows } from '../../user/entities/user-follows.entity';

@ViewEntity({
    name: 'user_posts_view',
    expression: `
        SELECT 
            t.tweet_id::text AS id,
            t.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            t.tweet_id,
            NULL::uuid AS repost_id,
            'tweet' AS post_type,
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
            t.created_at,
            t.updated_at
        FROM tweets t
        
        UNION ALL
        
        SELECT 
            (tr.tweet_id::text || '_' || tr.user_id::text) AS id,
            tr.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            tr.tweet_id,
            tr.tweet_id AS repost_id,
            'repost' AS post_type,
            tr.created_at AS post_date,
            t.type::text AS type,
            t.content,
            t.images,
            t.videos,
            t.num_likes,
            t.num_reposts,
            t.num_views,
            t.num_quotes,
            t.num_replies,
            t.created_at,
            t.updated_at
        FROM tweet_reposts tr
        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id
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
    created_at: Date;

    @ViewColumn()
    updated_at: Date;

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
}
