import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Message } from './message.entity';

@Entity('message_reactions')
@Index('IDX_MESSAGE_USER', ['message_id', 'user_id'])
@Unique('UQ_MESSAGE_USER', ['message_id', 'user_id'])
export class MessageReaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Message, (message) => message.reactions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'message_id' })
    message: Message;

    @Column()
    message_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    user_id: string;

    @Column({ type: 'varchar', length: 10 })
    emoji: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
