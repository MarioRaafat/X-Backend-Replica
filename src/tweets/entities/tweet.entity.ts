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
import { TweetRelation } from './tweet-relation.entity';

@Entity('tweets')
export class Tweet {
    @PrimaryGeneratedColumn('uuid')
    tweet_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

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

    @OneToMany(() => TweetRelation, relation => relation.sourceTweet)
    relationsAsSource: TweetRelation[];

    @OneToMany(() => TweetRelation, relation => relation.destinationTweet)
    relationsAsDestination: TweetRelation[];
}
