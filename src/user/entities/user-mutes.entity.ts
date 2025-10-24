import { Entity, JoinColumn, ManyToMany, PrimaryColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('user_mutes')
export class UserMutes {
    @PrimaryColumn({ type: 'uuid' })
    muter_id: string;

    @PrimaryColumn({ type: 'uuid' })
    muted_id: string;

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'muter_id' })
    muter: User;

    @ManyToMany(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'muted_id' })
    muted: User;

    constructor(user_mutes: Partial<UserMutes>) {
        Object.assign(this, user_mutes);
    }
}
