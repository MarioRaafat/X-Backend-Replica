import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('chats')
export class Chat {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user1_id' })
    user1: User;

    @Column()
    user1_id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user2_id' })
    user2: User;

    @Column()
    user2_id: string;

    @OneToMany('Message', 'chat')
    messages: Message[];

    // Denormalized fields for performance
    @ManyToOne(() => Message, { nullable: true })
    @JoinColumn({ name: 'last_message_id' })
    last_message: Message | null;

    @Column({ nullable: true })
    last_message_id: string | null;

    @Column({ type: 'int', default: 0 })
    unread_count_user1: number;

    @Column({ type: 'int', default: 0 })
    unread_count_user2: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
