import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from '../../user/entities/user.entity';

@Entity('tweet_reposts')
export class TweetRepost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'uuid' })
    tweet_id: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;
}
