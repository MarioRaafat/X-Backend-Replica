import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { DataSource, DeleteResult, Not, Repository } from 'typeorm';
import { InsertResult } from 'typeorm/browser';
import { CreateChatDto, GetChatsQueryDto, MarkMessagesReadDto } from './dto';
import { Chat } from './entities/chat.entity';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { PaginationService } from '../shared/services/pagination/pagination.service';

@Injectable()
export class ChatRepository extends Repository<Chat> {
    constructor(
        private dataSource: DataSource,
        private paginationService: PaginationService
    ) {
        super(Chat, dataSource.createEntityManager());
    }

    async createChat(user_id: string, dto: CreateChatDto) {
        try {
            const { recipient_id } = dto;
            const existing_chat = await this.findChat(user_id, recipient_id);

            if (existing_chat) {
                return existing_chat;
            } else {
                const new_chat = this.create({
                    user1_id: user_id,
                    user2_id: recipient_id,
                });
                return this.save(new_chat);
            }
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB);
        }
    }

    async findChat(user1_id: string, user2_id: string): Promise<Chat | null> {
        const chat = await this.findOne({
            where: [
                { user1_id: user1_id, user2_id: user2_id },
                { user1_id: user2_id, user2_id: user1_id },
            ],
        });
        return chat;
    }

    async findChatById(chat_id: string): Promise<Chat | null> {
        const chat = await this.findOne({
            where: { id: chat_id },
        });
        return chat;
    }

    async getChats(user_id: string, query: GetChatsQueryDto) {
        try {
            const qb = this.createQueryBuilder('chat')
                .leftJoinAndSelect('chat.user1', 'user1')
                .leftJoinAndSelect('chat.user2', 'user2')
                .leftJoinAndSelect('chat.last_message', 'last_message')
                .where('chat.user1_id = :user_id OR chat.user2_id = :user_id', { user_id })
                .orderBy('chat.updated_at', 'DESC')
                .addOrderBy('chat.id', 'DESC')
                .take(query.limit);

            this.paginationService.applyCursorPagination(
                qb,
                query?.cursor,
                'chat',
                'updated_at',
                'id'
            );

            const chats = await qb.getMany();

            // Map chats to response format
            const result = chats.map((chat) => {
                const participant = chat.user1_id === user_id ? chat.user2 : chat.user1;
                const unread_count =
                    chat.user1_id === user_id ? chat.unread_count_user1 : chat.unread_count_user2;

                return {
                    id: chat.id,
                    participant: participant
                        ? {
                              id: participant.id,
                              username: participant.username,
                              name: participant.name,
                              avatar_url: participant.avatar_url,
                          }
                        : null,
                    last_message: chat.last_message
                        ? {
                              id: chat.last_message.id,
                              content: chat.last_message.content,
                              message_type: chat.last_message.message_type,
                              sender_id: chat.last_message.sender_id,
                              created_at: chat.last_message.created_at,
                              is_read: chat.last_message.is_read,
                          }
                        : null,
                    unread_count,
                    created_at: chat.created_at,
                    updated_at: chat.updated_at,
                };
            });

            // Generate next cursor using PaginationService
            const next_cursor = this.paginationService.generateNextCursor(
                chats,
                'updated_at',
                'id'
            );

            return {
                data: result,
                count: result.length,
                next_cursor,
            };
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_FETCH_FROM_DB);
        }
    }

    async updateChat(chat_id: string, update_data: Partial<Chat>): Promise<Chat> {
        try {
            await this.update(chat_id, update_data);
            const updated_chat = await this.findOne({ where: { id: chat_id } });
            if (!updated_chat) {
                throw new InternalServerErrorException(ERROR_MESSAGES.CHAT_NOT_FOUND);
            }
            return updated_chat;
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
        }
    }
}
