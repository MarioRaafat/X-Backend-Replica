import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from '../../user/entities/user.entity';
import { UserFollows } from '../../user/entities/user-follows.entity';

@Entity('tweet_likes')
export class TweetLike {
    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @PrimaryColumn({ type: 'uuid' })
    tweet_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;

    // Virtual properties to hold follow relationship data
    // These are not columns in the database, but will be populated by queries
    follower_relation?: UserFollows | null; // User who liked follows current user
    following_relation?: UserFollows | null; // Current user follows user who liked
}
