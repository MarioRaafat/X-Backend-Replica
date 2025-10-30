import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
    github_id?: string;

    @Column({ type: 'varchar', nullable: true })
    facebook_id?: string;

    @Column({ type: 'varchar', nullable: true })
    google_id?: string;

    @Column({ type: 'varchar', nullable: true })
    avatar_url?: string;

    @Column({ type: 'text', nullable: true })
    cover_url?: string;

    @Column({ type: 'date' })
    birth_date: Date;

    // language code like 'en', 'es', 'fr', 'ar' etc.
    @Column({ type: 'varchar', nullable: false, default: 'en' })
    language: string;

    @Column({ type: 'boolean', default: false })
    verified: boolean;

    @Column({ type: 'varchar', nullable: true })
    country: string;

    @Column({ type: 'boolean', default: false })
    online: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    updated_at: Date;

    @Column({ type: 'int', default: 0 })
    followers: number;

    @Column({ type: 'int', default: 0 })
    following: number;

    constructor(user: Partial<User>) {
        Object.assign(this, user);
    }
}
