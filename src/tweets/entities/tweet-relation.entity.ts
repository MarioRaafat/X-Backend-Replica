import { 
    Entity, 
    PrimaryColumn, 
    Column, 
    CreateDateColumn, 
    ManyToOne, 
    JoinColumn 
} from 'typeorm';
import { Tweet } from './tweet.entity';
import { User } from 'src/user/entities/user.entity';

export enum TweetActionType {
    REPOST = 'Repost',
    REPOST_WITH_QUOTE = 'Repost_With_Quote',
    LIKE = 'Like',
    REPLY = 'Reply',
}

@Entity('tweet_relations')
export class TweetRelation {
    @PrimaryColumn({ type: 'uuid' })
    tweet_id_src: string;

    @PrimaryColumn({ type: 'uuid' })
    tweet_id_dest: string;

    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @Column({
        type: 'enum',
        enum: TweetActionType,
    })
    action_type: TweetActionType;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @ManyToOne(() => Tweet, tweet => tweet.relationsAsSource, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id_src' })
    sourceTweet: Tweet;

    @ManyToOne(() => Tweet, tweet => tweet.relationsAsDestination, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id_dest' })
    destinationTweet: Tweet;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
