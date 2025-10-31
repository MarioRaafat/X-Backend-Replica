import { Repository } from 'typeorm';
import { Tweet, TweetLike, TweetReply, TweetRepost } from './entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { TimelineResponseDto } from 'src/timeline/dto/timeline-response.dto';
import { TimelinePaginationDto } from 'src/timeline/dto/timeline-pagination.dto';
import { TweetResponseDTO } from './dto';

@Injectable()
export class TweetsRepository {
    constructor(
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetLike)
        private readonly tweet_like_repository: Repository<TweetLike>,
        @InjectRepository(TweetRepost)
        private readonly tweet_repost_repository: Repository<TweetRepost>
    ) {}

    async getFollowingTweets(
        user_id: string,
        pagination: TimelinePaginationDto
    ): Promise<{ tweets: Tweet[]; next_cursor: string | null }> {
        const query_builder = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .addSelect(['user.id', 'user.name', 'user.username', 'user.avatar_url'])
            .where(
                `tweet.user_id IN(
                SELECT followed_id 
                FROM user_follows
                WHERE follower_id=:user_id
                )
                `,
                { user_id }
            )

            //exclude muted users
            //blocked users are removed from user folllowings by default
            .andWhere(
                `tweet.user_id NOT IN(
                SELECT muted_id 
                FROM user_mutes
                WHERE muter_id=:user_id
                )
                `,
                { user_id }
            )
            .orderBy('tweet.created_at', 'DESC')
            .take(pagination.limit);

        // we may separate this in a new function for cursor pagination

        if (pagination.cursor) {
            const [cursor_timestamp, cursor_id] = pagination.cursor.split('_');
            if (cursor_timestamp && cursor_id) {
                query_builder.andWhere(
                    '(tweet.created_at < :cursor_timestamp OR (tweet.created_at = :cursor_timestamp AND tweet.tweet_id < :cursor_id))',
                    { cursor_timestamp, cursor_id }
                );
            }
        }

        const tweets = await query_builder.getMany();

        // we may separate this in a new function for next cursor generation
        const next_cursor =
            tweets.length > 0 && tweets.length === pagination.limit
                ? `${tweets[tweets.length - 1].created_at.toISOString()}_${tweets[tweets.length - 1].tweet_id}`
                : null;
        return {
            tweets: tweets,
            next_cursor: next_cursor,
        };
    }

    // to calc is_liked and is_reposted

    async checkUserInteractions(
        user_id: string,
        tweet_ids: string[]
    ): Promise<{ liked_tweet_ids: Set<string>; reposted_tweet_ids: Set<string> }> {
        const [liked, reposted] = await Promise.all([
            this.tweet_like_repository
                .createQueryBuilder('like')
                .select('like.tweet_id')
                .where('like.user_id = :user_id', { user_id })
                .andWhere('like.tweet_id IN (:...tweet_ids)', { tweet_ids })
                .getMany(),

            this.tweet_repost_repository
                .createQueryBuilder('repost')
                .select('repost.tweet_id')
                .where('repost.user_id = :user_id', { user_id })
                .andWhere('repost.tweet_id IN (:...tweet_ids)', { tweet_ids })
                .getMany(),
        ]);

        return {
            liked_tweet_ids: new Set(liked.map((l) => l.tweet_id)),
            reposted_tweet_ids: new Set(reposted.map((r) => r.tweet_id)),
        };
    }
}
