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
    phone_number?: string;

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

    // Role can be 'user', 'admin' only
    @Column({ type: 'varchar', default: 'user' })
    role: string;

    @Column({ type: 'varchar', nullable: true })
    gender?: string;

    // language code like 'en', 'es', 'fr', 'ar' etc.
    @Column({ type: 'varchar', nullable: false, default: 'en' })
    language: string;

    @Column({ type: 'boolean', default: false })
    verified: boolean;

    // TODO: country
    // @Column({ type: 'varchar', nullable: true })
    // country: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    updated_at: Date;

    constructor(user: Partial<User>) {
        Object.assign(this, user);
    }
}
