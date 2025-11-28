export const tweet_fields_slect = [
    'tweet.tweet_id',
    'tweet.user_id',
    'tweet.type',
    'tweet.content',
    'tweet.images',
    'tweet.videos',
    'tweet.num_likes',
    'tweet.num_reposts',
    'tweet.num_views',
    'tweet.num_quotes',
    'tweet.num_replies',
    'tweet.num_bookmarks',
    'tweet.created_at',
    'tweet.updated_at',
    'user.id',
    'user.username',
    'user.name',
    'user.avatar_url',
    'user.verified',
    'user.bio',
    'user.cover_url',
    'user.followers',
    'user.following',
];

// if (current_user_id) {
//             query
//                 .leftJoinAndMapOne(
//                     'quote_tweet.current_user_like',
//                     TweetLike,
//                     'current_user_like',
//                     'current_user_like.tweet_id = quote_tweet.tweet_id AND current_user_like.user_id = :current_user_id',
//                     { current_user_id }
//                 )
//                 .leftJoinAndMapOne(
//                     'quote_tweet.current_user_repost',
//                     TweetRepost,
//                     'current_user_repost',
//                     'current_user_repost.tweet_id = quote_tweet.tweet_id AND current_user_repost.user_id = :current_user_id',
//                     { current_user_id }
//                 )
//                 .leftJoinAndMapOne(
//                     'user.current_user_follows',
//                     UserFollows,
//                     'current_user_follows',
//                     'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
//                     { current_user_id }
//                 );
//         }
//         if (current_user_id) {
//             query
//                 .leftJoinAndMapOne(
//                     'tweet.current_user_like',
//                     TweetLike,
//                     'current_user_like',
//                     'current_user_like.tweet_id = tweet.tweet_id AND current_user_like.user_id = :current_user_id',
//                     { current_user_id }
//                 )
//                 .leftJoinAndMapOne(
//                     'tweet.current_user_repost',
//                     TweetRepost,
//                     'current_user_repost',
//                     'current_user_repost.tweet_id = tweet.tweet_id AND current_user_repost.user_id = :current_user_id',
//                     { current_user_id }
//                 )
//                 .leftJoinAndMapOne(
//                     'user.current_user_follows',
//                     UserFollows,
//                     'current_user_follows',
//                     'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
//                     { current_user_id }
//                 );
//             }
