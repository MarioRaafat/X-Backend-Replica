import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GetMessagesQueryDto, SendMessageDto } from './dto';
import { Message, MessageType } from './entities/message.entity';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { PaginationService } from '../shared/services/pagination/pagination.service';
import { EncryptionService } from '../shared/services/encryption/encryption.service';
import { Chat } from 'src/chat/entities/chat.entity';

@Injectable()
export class MessageRepository extends Repository<Message> {
    constructor(
        private readonly data_source: DataSource,
        private readonly pagination_service: PaginationService,
        private readonly encryption_service: EncryptionService
    ) {
        super(Message, data_source.createEntityManager());
    }

    async createMessage(
        sender_id: string,
        chat_id: string,
        dto: SendMessageDto,
        is_read: boolean = false
    ): Promise<Message> {
        try {
            const encrypted_content = this.encryption_service.encrypt(dto.content);

            const message = this.create({
                sender_id,
                chat_id,
                content: encrypted_content,
                image_url: dto.image_url || null,
                voice_note_url: dto.voice_note_url || null,
                voice_note_duration: dto.voice_note_duration || null,
                message_type: dto.message_type || MessageType.TEXT,
                reply_to_message_id: dto.reply_to_message_id || null,
                is_read: is_read,
            });

            const saved_message = await this.save(message);

            // Update chat's last_message and updated_at
            await this.data_source
                .getRepository(Chat)
                .update({ id: chat_id }, { last_message_id: saved_message.id });

            // Return message with sender information
            const message_with_relations = await this.findOne({
                where: { id: saved_message.id },
                relations: ['sender', 'reply_to', 'reply_to.sender'],
            });

            if (!message_with_relations) {
                throw new InternalServerErrorException('Failed to retrieve created message');
            }

            message_with_relations.content = this.encryption_service.decrypt(
                message_with_relations.content
            );

            return message_with_relations;
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB);
        }
    }

    async findMessagesByChatId(chat_id: string, query: GetMessagesQueryDto): Promise<Message[]> {
        try {
            const { limit = 50, cursor } = query;

            let query_builder = this.createQueryBuilder('message')
                .leftJoinAndSelect('message.sender', 'sender')
                .leftJoinAndSelect('message.reply_to', 'reply_to')
                .leftJoinAndSelect('reply_to.sender', 'reply_sender')
                .leftJoinAndSelect('message.reactions', 'reactions')
                .leftJoinAndSelect('reactions.user', 'reaction_user')
                .where('message.chat_id = :chat_id', { chat_id })
                // .andWhere('message.is_deleted = :is_deleted', { is_deleted: false }) // commented until see if we want to hide deleted messages or show "This message was deleted"
                .orderBy('message.created_at', 'DESC')
                .addOrderBy('reactions.created_at', 'ASC')
                .take(limit + 1); // Fetch one extra to check if there's a next page

            // Apply cursor-based pagination using PaginationService
            query_builder = this.pagination_service.applyCursorPagination(
                query_builder,
                cursor,
                'message',
                'created_at',
                'id'
            );

            const messages = await query_builder.getMany();

            return messages.map((msg) => ({
                ...msg,
                content: msg.is_deleted
                    ? msg.content
                    : this.encryption_service.decrypt(msg.content),
            }));
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB);
        }
    }

    async findMessageById(message_id: string): Promise<Message | null> {
        try {
            const message = await this.findOne({
                where: { id: message_id, is_deleted: false },
                relations: ['sender', 'chat', 'reply_to', 'reply_to.sender'],
            });

            if (!message) return null;

            // Decrypt content
            return {
                ...message,
                content: this.encryption_service.decrypt(message.content),
            };
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB);
        }
    }

    async updateMessageContent(message_id: string, content: string): Promise<Message> {
        try {
            const encrypted_content = this.encryption_service.encrypt(content);

            await this.update(
                { id: message_id },
                {
                    content: encrypted_content,
                    is_edited: true,
                }
            );

            const updated_message = await this.findOne({
                where: { id: message_id },
                relations: ['sender', 'reply_to', 'reply_to.sender'],
            });

            if (!updated_message) {
                throw new InternalServerErrorException('Failed to retrieve updated message');
            }

            return {
                ...updated_message,
                content: this.encryption_service.decrypt(updated_message.content),
            };
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
        }
    }

    async deleteMessage(message_id: string): Promise<Message> {
        try {
            await this.update(
                { id: message_id },
                {
                    is_deleted: true,
                    deleted_at: new Date(),
                    content: 'This message was deleted',
                }
            );

            const deleted_message = await this.findOne({
                where: { id: message_id },
            });

            if (!deleted_message) {
                throw new InternalServerErrorException('Failed to retrieve deleted message');
            }

            return deleted_message;
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
        }
    }
}
