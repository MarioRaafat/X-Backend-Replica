import { SelectQueryBuilder } from 'typeorm';

export function getPostsByUserIdAlyaaQuery(
    query: SelectQueryBuilder<any>,
    user_id: string
): SelectQueryBuilder<any> {
    return query
        .select([
            'tweet.tweet_id AS tweet_id',
            'tweet.profile_user_id AS profile_user_id',
            'tweet.tweet_author_id AS tweet_author_id',
            'tweet.repost_id AS repost_id',
            'tweet.post_type AS post_type',
            'tweet.type AS type',
            'tweet.content AS content',
            'tweet.images AS images',
            'tweet.videos AS videos',
            'tweet.num_likes AS num_likes',
            'tweet.num_reposts AS num_reposts',
            'tweet.num_views AS num_views',
            'tweet.num_bookmarks AS num_bookmarks',
            'tweet.num_quotes AS num_quotes',
            'tweet.num_replies AS num_replies',
            'tweet.created_at AS created_at',
            'tweet.post_date AS post_date',
            'tweet.updated_at AS updated_at',
            'tweet.mentions AS mentions',
            `json_build_object(
            'id', tweet.tweet_author_id,
            'username', tweet.username,
            'name', tweet.name,
            'avatar_url', tweet.avatar_url,
            'cover_url', tweet.cover_url,
            'verified', tweet.verified,
            'bio', tweet.bio,
            'followers', tweet.followers,
            'following', tweet.following
        ) AS user`,
        ])
        .where('tweet.profile_user_id = :user_id', { user_id });
}

export function getPostsByUserIdAlyaaQueryWithoutView(
    query: SelectQueryBuilder<any>,
    user_id: string
): SelectQueryBuilder<any> {
    return query.select([
        'tweet.tweet_id AS tweet_id',
        'tweet.profile_user_id AS profile_user_id',
        'tweet.tweet_author_id AS tweet_author_id',
        'tweet.repost_id AS repost_id',
        'tweet.post_type AS post_type',
        'tweet.type AS type',
        'tweet.content AS content',
        'tweet.type AS type',
        'tweet.post_date AS post_date',
        'tweet.images AS images',
        'tweet.videos AS videos',
        'tweet.num_likes AS num_likes',
        'tweet.num_reposts AS num_reposts',
        'tweet.num_views AS num_views',
        'tweet.num_quotes AS num_quotes',
        'tweet.num_replies AS num_replies',
        'tweet.created_at AS created_at',
        'tweet.updated_at AS updated_at',
        'tweet.mentions AS mentions',
        'like.created_at AS liked_at',
        `json_build_object(
            'id', tweet.tweet_author_id,
            'username', tweet.username,
            'name', tweet.name,
            'avatar_url', tweet.avatar_url,
            'cover_url', tweet.cover_url,
            'verified', tweet.verified,
            'bio', tweet.bio,
            'followers', tweet.followers,
            'following', tweet.following
        ) AS user`,
    ]);
}
