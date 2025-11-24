import { User } from '../../user/entities/user.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from 'typeorm';

@Entity('hashtag')
export class Hashtag {
    @PrimaryColumn({ type: 'varchar' })
    name: string;

    @Column({ type: 'int', default: 0 })
    usage_count: number;

    @ManyToOne(() => User, (user) => user.hashtags, {})
    @JoinColumn({ name: 'created_by', referencedColumnName: 'id' })
    created_by: User;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    // I guess we won't need this but just in case
    @DeleteDateColumn({ type: 'timestamptz' })
    deleted_at: Date;
}
