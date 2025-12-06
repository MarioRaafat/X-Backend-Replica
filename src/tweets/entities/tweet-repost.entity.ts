import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from '../../user/entities/user.entity';
import { UserFollows } from '../../user/entities/user-follows.entity';

@Entity('tweet_reposts')
export class TweetRepost {
    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @PrimaryColumn({ type: 'uuid' })
    tweet_id: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;

    follower_relation?: UserFollows | null; // User who reposted follows current user
    following_relation?: UserFollows | null; // Current user follows user who reposted
}
