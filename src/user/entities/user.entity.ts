import { Exclude } from 'class-transformer';
import { Tweet } from '../../tweets/entities/tweet.entity';
import { Hashtag } from '../../tweets/entities/hashtags.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    @Exclude()
    email: string;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    password: string;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar', unique: true })
    username: string;

    @Column({ type: 'text', nullable: true })
    @Exclude()
    bio?: string;

    @Column({ type: 'varchar', nullable: true, unique: true })
    @Exclude()
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
    avatar_url?: string;

    @Column({ type: 'text', nullable: true })
    @Exclude()
    cover_url?: string;

    @Column({ type: 'date' })
    @Exclude()
    birth_date: Date;

    // language code like 'en', 'es', 'fr', 'ar' etc.
    @Column({ type: 'varchar', nullable: false, default: 'en' })
    @Exclude()
    language: string;

    @Column({ type: 'boolean', default: false })
    verified: boolean;

    @Column({ type: 'varchar', nullable: true })
    @Exclude()
    country: string;

    @Column({ type: 'boolean', default: false })
    @Exclude()
    online: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @Exclude()
    created_at: Date;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    @Exclude()
    updated_at: Date;

    @Column({ type: 'int', default: 0 })
    @Exclude()
    followers: number;

    @Column({ type: 'int', default: 0 })
    @Exclude()
    following: number;

    @OneToMany(() => Hashtag, (hashtags) => hashtags.created_by, { onDelete: 'CASCADE' })
    @Exclude()
    hashtags: Hashtag[];

    @OneToMany(() => Tweet, (tweet) => tweet.user, {})
    @Exclude()
    tweets: Tweet[];

    constructor(user: Partial<User>) {
        Object.assign(this, user);
    }
}
