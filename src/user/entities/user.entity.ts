import { Exclude } from 'class-transformer';
import { Tweet } from '../../tweets/entities/tweet.entity';
import { Hashtag } from '../../tweets/entities/hashtags.entity';
import {
    Column,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserFollows } from './user-follows.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    password: string;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar', unique: true })
    username: string;

    @Column({ type: 'text', nullable: true })
    bio?: string;

    @Column({ type: 'varchar', nullable: true, unique: true })
    phone_number?: string | null;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    github_id?: string;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    facebook_id?: string;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    google_id?: string;

    @Column({ type: 'varchar', nullable: true })
    avatar_url?: string | null;

    @Column({ type: 'text', nullable: true })
    cover_url?: string | null;

    @Column({ type: 'date' })
    birth_date: Date;

    @Column({ type: 'varchar', nullable: false, default: 'en' })
    language: 'en' | 'ar';

    @Column({ type: 'boolean', default: false })
    verified: boolean;

    @Column({ type: 'varchar', nullable: true })
    country?: string | null;

    @Column({ type: 'boolean', default: false })
    online: boolean;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deleted_at: Date | null;

    @Column({ type: 'int', default: 0 })
    followers: number;

    @Column({ type: 'int', default: 0 })
    following: number;

    @Column({ name: 'fcm_token', type: 'varchar', unique: true, nullable: true })
    fcm_token?: string | null;

    @OneToMany(() => Hashtag, (hashtags) => hashtags.created_by, { onDelete: 'CASCADE' })
    hashtags: Hashtag[];

    @OneToMany(() => Tweet, (tweet) => tweet.user, {})
    tweets: Tweet[];

    current_user_follows?: UserFollows | null;
    is_following?: boolean;

    constructor(user: Partial<User>) {
        Object.assign(this, user);
    }
}
