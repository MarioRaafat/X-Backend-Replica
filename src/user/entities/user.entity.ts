import { Exclude } from 'class-transformer';
import { Tweet } from '../../tweets/entities/tweet.entity';
import { Hashtag } from '../../tweets/entities/hashtags.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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
    avatar_url?: string;

    @Column({ type: 'text', nullable: true })
    cover_url?: string;

    @Column({ type: 'date' })
    birth_date: Date;

    // 'en', 'ar'.
    @Column({ type: 'varchar', nullable: false, default: 'en' })
    @Exclude()
    language: 'en' | 'ar';

    @Column({ type: 'boolean', default: false })
    verified: boolean = false;

    @Column({ type: 'varchar', nullable: true })
    country?: string | null;

    @Column({ type: 'boolean', default: false })
    @Exclude()
    online: boolean = false;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    @UpdateDateColumn()
    @Exclude()
    updated_at: Date;

    @Column({ type: 'int', default: 0 })
    followers: number = 0;

    @Column({ type: 'int', default: 0 })
    following: number = 0;

    @OneToMany(() => Hashtag, (hashtags) => hashtags.created_by, { onDelete: 'CASCADE' })
    hashtags: Hashtag[];

    @OneToMany(() => Tweet, (tweet) => tweet.user, {})
    tweets: Tweet[];

    constructor(user: Partial<User>) {
        Object.assign(this, user);
    }
}
