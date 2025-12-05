import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from 'typeorm';
import { Tweet } from './tweet.entity';

@Entity('tweet_summaries')
export class TweetSummary {
    @PrimaryColumn({ type: 'uuid' })
    tweet_id: string;
    @Column({ type: 'text' })
    summary: string;

    @OneToOne(() => Tweet, (tweet) => tweet.summary, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;
}
