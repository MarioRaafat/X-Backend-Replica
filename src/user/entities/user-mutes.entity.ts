import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_mutes')
export class UserMutes {
    @PrimaryColumn({ type: 'uuid' })
    muter_id: string;

    @PrimaryColumn({ type: 'uuid' })
    muted_id: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'muter_id' })
    muter: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'muted_id' })
    muted: User;

    constructor(user_mutes: Partial<UserMutes>) {
        Object.assign(this, user_mutes);
    }
}
