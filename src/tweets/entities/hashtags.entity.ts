import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryColumn,
} from 'typeorm';
import { TweetHashtag } from './tweet-hashtag.entity';

@Entity('hashtag')
export class Hashtag {
    @PrimaryColumn({ type: 'varchar' })
    name: string;

    @Column({ type: 'int', default: 0 })
    usage_count: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @Column({ type: 'varchar', nullable: true })
    category?: string;

    // I guess we won't need this but just in case
    @DeleteDateColumn({ type: 'timestamptz' })
    deleted_at: Date;

    @OneToMany(() => TweetHashtag, (tweet_hashtag) => tweet_hashtag.hashtag)
    tweet_hashtags: TweetHashtag[];
}
