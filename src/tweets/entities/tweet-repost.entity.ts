import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from '../../user/entities/user.entity';
import { UserFollows } from '../../user/entities/user-follows.entity';

@Entity('tweet_reposts')
@Unique('UQ_tweet_reposts_user_tweet', ['user_id', 'tweet_id'])
export class TweetRepost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'uuid' })
    tweet_id: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;

    // Virtual properties to hold follow relationship data
    // These are not columns in the database, but will be populated by queries
    follower_relation?: UserFollows | null; // User who reposted follows current user
    following_relation?: UserFollows | null; // Current user follows user who reposted
}
