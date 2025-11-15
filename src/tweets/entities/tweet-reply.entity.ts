import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from '../../user/entities/user.entity';

@Entity('tweet_replies')
export class TweetReply {
    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @PrimaryColumn({ type: 'uuid' })
    reply_tweet_id: string;

    @PrimaryColumn({ type: 'uuid' })
    original_tweet_id: string;

    @Column({ type: 'uuid', nullable: true })
    conversation_id: string | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reply_tweet_id' })
    reply_tweet: Tweet;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'original_tweet_id' })
    original_tweet: Tweet;
}
