import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from '../../user/entities/user.entity';

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
}
