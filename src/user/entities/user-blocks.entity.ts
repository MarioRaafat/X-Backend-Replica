import { Entity, JoinColumn, ManyToMany, PrimaryColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('user_blocks')
export class UserBlocks {
    @PrimaryColumn({ type: 'uuid' })
    blocker_id: string;

    @PrimaryColumn({ type: 'uuid' })
    blocked_id: string;

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocker_id' })
    blocker: User;

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'blocked_id' })
    blocked: User;
}
