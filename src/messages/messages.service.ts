import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { MessageRepository } from './messages.repository';
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from 'src/chat/entities/chat.entity';
import { Repository } from 'typeorm';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { MessageType } from './entities/message.entity';

@Injectable()
export class MessagesService {
    constructor(
        private readonly message_repository: MessageRepository,
        @InjectRepository(Chat)
        private readonly chat_repository: Repository<Chat>
    ) {}

    async sendMessage(user_id: string, chat_id: string, dto: SendMessageDto) {
        // Validate chat exists and user is a participant
        const chat = await this.chat_repository.findOne({
            where: { id: chat_id },
        });

        if (!chat) {
            throw new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND);
        }

        if (chat.user1_id !== user_id && chat.user2_id !== user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT);
        }

        // Validate message content
        if (!dto.content || dto.content.trim().length === 0) {
            throw new BadRequestException(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED);
        }

        // If it's a reply, validate the message being replied to
        if (dto.message_type === MessageType.REPLY && dto.reply_to_message_id) {
            const reply_to_message = await this.message_repository.findOne({
                where: { id: dto.reply_to_message_id, chat_id },
            });

            if (!reply_to_message) {
                throw new NotFoundException(ERROR_MESSAGES.REPLY_TO_MESSAGE_NOT_FOUND);
            }
        }

        // Create message
        const message = await this.message_repository.createMessage(user_id, chat_id, dto);

        // Update unread count for the recipient
        const recipient_unread_field =
            chat.user1_id === user_id ? 'unread_count_user2' : 'unread_count_user1';
        await this.chat_repository.increment({ id: chat_id }, recipient_unread_field, 1);

        return message;
    }

    async getMessages(user_id: string, chat_id: string, query: GetMessagesQueryDto) {
        // Validate chat exists and user is a participant
        const chat = await this.chat_repository.findOne({
            where: { id: chat_id },
            relations: ['user1', 'user2'],
        });

        if (!chat) {
            throw new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND);
        }

        if (chat.user1_id !== user_id && chat.user2_id !== user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT);
        }

        // Get messages
        const messages = await this.message_repository.findMessagesByChatId(chat_id, query);

        // Get the other user in the chat
        const other_user = chat.user1_id === user_id ? chat.user2 : chat.user1;

        return {
            sender: {
                id: other_user.id,
                username: other_user.username,
                name: other_user.name,
                avatar_url: other_user.avatar_url,
            },
            messages: messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                message_type: msg.message_type,
                reply_to: msg.reply_to_message_id,
                is_read: msg.is_read,
                is_edited: msg.is_edited,
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                sender: {
                    id: msg.sender.id,
                    username: msg.sender.username,
                    name: msg.sender.name,
                    avatar_url: msg.sender.avatar_url,
                },
            })),
        };
    }

    async updateMessage(
        user_id: string,
        chat_id: string,
        message_id: string,
        dto: UpdateMessageDto
    ) {
        // Validate message exists
        const message = await this.message_repository.findMessageById(message_id);

        if (!message) {
            throw new NotFoundException(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
        }

        // Validate message belongs to the chat
        if (message.chat_id !== chat_id) {
            throw new BadRequestException('Message does not belong to this chat');
        }

        // Validate user is the sender
        if (message.sender_id !== user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_MESSAGE);
        }

        // Validate new content
        if (!dto.content || dto.content.trim().length === 0) {
            throw new BadRequestException(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED);
        }

        // Update message
        const updated_message = await this.message_repository.updateMessageContent(
            message_id,
            dto.content
        );

        return {
            id: updated_message.id,
            content: updated_message.content,
            message_type: updated_message.message_type,
            updated_at: updated_message.updated_at,
            is_edited: updated_message.is_edited,
        };
    }

    async deleteMessage(user_id: string, chat_id: string, message_id: string) {
        // Validate message exists
        const message = await this.message_repository.findMessageById(message_id);

        if (!message) {
            throw new NotFoundException(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
        }

        // Validate message belongs to the chat
        if (message.chat_id !== chat_id) {
            throw new BadRequestException('Message does not belong to this chat');
        }

        // Validate user is the sender
        if (message.sender_id !== user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_MESSAGE);
        }

        // Soft delete message
        const deleted_message = await this.message_repository.softDeleteMessage(message_id);

        return {
            id: deleted_message.id,
            is_deleted: deleted_message.is_deleted,
            deleted_at: deleted_message.deleted_at,
        };
    }
}
