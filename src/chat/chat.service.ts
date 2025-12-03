import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateChatDto, GetChatsQueryDto, MarkMessagesReadDto } from './dto';
import { ChatRepository } from './chat.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../messages/entities/message.entity';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ERROR_MESSAGES } from '../constants/swagger-messages';

@Injectable()
export class ChatService {
    constructor(
        private readonly chat_repository: ChatRepository,
        @InjectRepository(Message)
        private readonly message_repository: Repository<Message>
    ) {}

    async createChat(user_id: string, dto: CreateChatDto) {
        try {
            return this.chat_repository.createChat(user_id, dto);
        } catch (error) {
            console.error('Error in createChat:', error);
            throw error;
        }
    }

    async getChats(user_id: string, query: GetChatsQueryDto) {
        const result = await this.chat_repository.getChats(user_id, query);

        return {
            data: result.data,
            pagination: {
                next_cursor: result.next_cursor,
                has_more: result.has_more,
            },
        };
    }

    // I know it's a confusing to add last_messages_as_read in the dto
    // the reason: the mobile could send at specific time the last read message id so I should handle it here
    async markMessagesAsRead(user_id: string, chat_id: string, dto: MarkMessagesReadDto) {
        const chat = await this.chat_repository.findOne({
            where: { id: chat_id },
        });

        if (!chat) {
            throw new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND);
        }

        if (chat.user1_id !== user_id && chat.user2_id !== user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT);
        }

        // If last_read_message_id is provided, verify it belongs to this chat, remember that it could be null as it's optional
        if (dto.last_read_message_id) {
            const last_message = await this.message_repository.findOne({
                where: { id: dto.last_read_message_id },
            });

            if (!last_message) {
                throw new NotFoundException(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
            }

            if (last_message.chat_id !== chat_id) {
                throw new BadRequestException(ERROR_MESSAGES.LAST_READ_MESSAGE_NOT_IN_CHAT);
            }
        }

        // mark messages as read (up to last_read_message_id or all messages)
        const query_builder = this.message_repository
            .createQueryBuilder()
            .update(Message)
            .set({ is_read: true })
            .where('chat_id = :chat_id', { chat_id })
            .andWhere('sender_id != :user_id', { user_id })
            .andWhere('is_read = false');

        if (dto.last_read_message_id) {
            const last_message = await this.message_repository.findOne({
                where: { id: dto.last_read_message_id },
                select: ['created_at'],
            });

            query_builder.andWhere('created_at <= :created_at', {
                created_at: last_message?.created_at,
            });
        }
        const result = await query_builder.execute();
        const messages_marked_read = result.affected || 0;

        // recalculate unread count for the user
        const unread_count = await this.message_repository.count({
            where: {
                chat_id,
                is_read: false,
                sender_id: chat.user1_id === user_id ? chat.user2_id : chat.user1_id,
            },
        });

        const update_data: any = {};
        if (chat.user1_id === user_id) {
            update_data.unread_count_user1 = unread_count;
        } else {
            update_data.unread_count_user2 = unread_count;
        }

        await this.chat_repository.updateChat(chat_id, update_data);

        return {
            chat_id,
            messages_marked_read,
            read_at: new Date(),
        };
    }
}
