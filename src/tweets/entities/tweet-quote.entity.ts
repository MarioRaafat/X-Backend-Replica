import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from '../../user/entities/user.entity';

@Entity('tweet_quotes')
export class TweetQuote {
    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @PrimaryColumn({ type: 'uuid' })
    quote_tweet_id: string;

    @PrimaryColumn({ type: 'uuid' })
    original_tweet_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tweet, { cascade: true, onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'quote_tweet_id' })
    quote_tweet: Tweet;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE', eager: true })
    @JoinColumn({ name: 'original_tweet_id' })
    original_tweet: Tweet;
}
