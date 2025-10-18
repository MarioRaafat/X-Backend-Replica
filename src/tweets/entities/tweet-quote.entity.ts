import { 
    Entity, 
    PrimaryColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from 'src/user/entities/user.entity';

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

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'quote_tweet_id' })
    quote_tweet: Tweet;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'original_tweet_id' })
    original_tweet: Tweet;
}
