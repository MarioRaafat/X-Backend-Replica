import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn, 
    ManyToOne, 
    JoinColumn,
    OneToMany
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { TweetLike } from './tweet-like.entity';
import { TweetRepost } from './tweet-repost.entity';
import { TweetQuote } from './tweet-quote.entity';
import { TweetReply } from './tweet-reply.entity';

@Entity('tweets')
export class Tweet {
    @PrimaryGeneratedColumn('uuid')
    tweet_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'uuid', nullable: true })
    parent_tweet_id: string;

    @Column({ type: 'varchar', length: 280 })
    content: string;

    @Column({ type: 'text', array: true, default: '{}' })
    images: string[];

    @Column({ type: 'text', array: true, default: '{}' })
    videos: string[];

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'parent_tweet_id' })
    parent_tweet: Tweet;

    @OneToMany(() => Tweet, tweet => tweet.parent_tweet)
    child_tweets: Tweet[];

    @OneToMany(() => TweetLike, like => like.tweet)
    likes: TweetLike[];

    @OneToMany(() => TweetRepost, repost => repost.tweet)
    reposts: TweetRepost[];

    @OneToMany(() => TweetQuote, quote => quote.quote_tweet)
    quotes_as_quote: TweetQuote[];

    @OneToMany(() => TweetQuote, quote => quote.original_tweet)
    quotes_as_original: TweetQuote[];

    @OneToMany(() => TweetReply, reply => reply.reply_tweet)
    replies_as_reply: TweetReply[];

    @OneToMany(() => TweetReply, reply => reply.parent_tweet)
    replies_as_parent: TweetReply[];
}
