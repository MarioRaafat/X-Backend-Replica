import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Chat } from './chat.entity';

export enum MessageType {
    TEXT = 'text',
    REPLY = 'reply',
}

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    content: string;

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT,
    })
    message_type: MessageType;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @Column()
    sender_id: string;

    @ManyToOne('Chat', 'messages')
    @JoinColumn({ name: 'chat_id' })
    chat: Chat;

    @Column()
    chat_id: string;

    @ManyToOne(() => Message, { nullable: true })
    @JoinColumn({ name: 'reply_to_message_id' })
    reply_to: Message | null;

    @Column({ nullable: true })
    reply_to_message_id: string | null;

    @Column({ default: false })
    is_read: boolean;

    @Column({ default: false })
    is_edited: boolean;

    @Column({ default: false })
    is_deleted: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ nullable: true })
    deleted_at: Date | null;
}
