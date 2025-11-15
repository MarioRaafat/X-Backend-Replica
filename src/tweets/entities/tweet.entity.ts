import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TweetLike } from './tweet-like.entity';
import { TweetQuote } from './tweet-quote.entity';
import { TweetRepost } from './tweet-repost.entity';
import { TweetReply } from './tweet-reply.entity';
import { UserFollows } from '../../user/entities/user-follows.entity';
import { TweetType } from '../../shared/enums/tweet-types.enum';

// removed conversation_id
@Entity('tweets')
export class Tweet {
    @PrimaryGeneratedColumn('uuid')
    tweet_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    // nullable should be true
    @Column({ type: 'enum', enum: TweetType, nullable: true })
    type: TweetType;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'text', array: true, default: '{}' })
    images: string[];

    @Column({ type: 'text', array: true, default: '{}' })
    videos: string[];

    @Column({ name: 'num_likes', type: 'int', default: 0 })
    num_likes: number;

    @Column({ name: 'num_reposts', type: 'int', default: 0 })
    num_reposts: number;

    @Column({ name: 'num_views', type: 'int', default: 0 })
    num_views: number;

    @Column({ name: 'num_quotes', type: 'int', default: 0 })
    num_quotes: number;

    @Column({ name: 'num_replies', type: 'int', default: 0 })
    num_replies: number;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deleted_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => TweetLike, (tweet_like) => tweet_like.tweet, {
        onDelete: 'CASCADE',
    })
    likes: TweetLike[];

    @OneToMany(() => TweetReply, (tweet_reply) => tweet_reply.original_tweet, {
        onDelete: 'CASCADE',
    })
    replies: TweetReply[];

    @OneToMany(() => TweetQuote, (tweet_quote) => tweet_quote.original_tweet, {
        onDelete: 'CASCADE',
    })
    quotes: TweetQuote[];

    @OneToMany(() => TweetRepost, (tweet_repost) => tweet_repost.tweet, { onDelete: 'CASCADE' })
    reposts: TweetRepost[];

    // Virtual fields for current user interactions (loaded via leftJoinAndMapOne in queries)
    current_user_like?: TweetLike | null;
    current_user_repost?: TweetRepost | null;
    user_follows_author?: UserFollows | null;
}
