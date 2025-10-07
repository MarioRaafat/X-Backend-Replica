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
    first_name: string;

    @Column({ type: 'varchar' })
    last_name: string;

    @Column({ type: 'varchar' })
    phone_number: string;

    @Column({ type: 'varchar', nullable: true })
    github_id?: string;

    @Column({ type: 'varchar', nullable: true })
    facebook_id?: string;

    @Column({ type: 'varchar', nullable: true })
    google_id?: string;

    @Column({ type: 'varchar', nullable: true })
    avatar_url?: string;

    constructor(user: Partial<User>) {
        Object.assign(this, user);
    }
}
