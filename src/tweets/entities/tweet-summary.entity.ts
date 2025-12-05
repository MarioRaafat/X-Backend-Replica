import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Tweet } from './tweet.entity';

@Entity('tweet_summaries')
export class TweetSummary {
    @PrimaryColumn({ type: 'uuid' })
    tweet_id: string;
    @Column({ type: 'text' })
    summary: string;
    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
    @OneToOne(() => Tweet, (tweet) => tweet.summary, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;
}
