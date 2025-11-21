import { Column, Entity, JoinColumn, ManyToMany, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_blocks')
export class UserBlocks {
    @PrimaryColumn({ type: 'uuid' })
    blocker_id: string;

    @PrimaryColumn({ type: 'uuid' })
    blocked_id: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocker_id' })
    blocker: User;

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocked_id' })
    blocked: User;

    constructor(user_blocks: Partial<UserBlocks>) {
        Object.assign(this, user_blocks);
    }
}
