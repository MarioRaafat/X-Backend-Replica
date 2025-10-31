import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_follows')
export class UserFollows {
    @PrimaryColumn({ type: 'uuid' })
    follower_id: string;

    @PrimaryColumn({ type: 'uuid' })
    followed_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'follower_id' })
    follower: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followed_id' })
    followed: User;

    constructor(user_follows: Partial<UserFollows>) {
        Object.assign(this, user_follows);
    }
}
