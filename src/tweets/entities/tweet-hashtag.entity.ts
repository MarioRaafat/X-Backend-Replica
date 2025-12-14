import { Column, Entity, ForeignKey, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tweet } from './tweet.entity';
import { Hashtag } from './hashtags.entity';

@Entity('tweet_hashtags')
export class TweetHashtag {
    @PrimaryColumn('uuid')
    tweet_id: string;

    @PrimaryColumn('varchar')
    hashtag_name: string;
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    tweet_created_at: Date;

    @ManyToOne(() => Tweet, (tweet) => tweet.tweet_hashtags, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;

    @ManyToOne(() => Hashtag, (hashtag) => hashtag.tweet_hashtags, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'hashtag_name' })
    hashtag: Hashtag;
}
