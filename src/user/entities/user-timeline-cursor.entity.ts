import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_timeline_cursors')
export class UserTimelineCursor {
    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'uuid', nullable: true })
    last_fetched_tweet_id: string | null;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    last_updated_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
