import { Injectable } from '@nestjs/common';
import {
    create_chat_dto,
    GetChatsQueryDto,
    GetMessagesQueryDto,
    mark_messages_read_dto,
    SearchChatsQueryDto,
    send_message_dto,
    update_message_dto,
} from './dto';

@Injectable()
export class ChatService {
    async createChat(user_id: string, dto: create_chat_dto) {
        throw new Error('Method not implemented');
    }

    async getChats(user_id: string, query: GetChatsQueryDto) {
        throw new Error('Method not implemented');
    }

    async getChat(user_id: string, chat_id: string) {
        throw new Error('Method not implemented');
    }

    async deleteChat(user_id: string, chat_id: string) {
        throw new Error('Method not implemented');
    }

    async searchChats(user_id: string, query: SearchChatsQueryDto) {
        throw new Error('Method not implemented');
    }

    async sendMessage(user_id: string, chat_id: string, dto: send_message_dto) {
        throw new Error('Method not implemented');
    }

    async getMessages(user_id: string, chat_id: string, query: GetMessagesQueryDto) {
        throw new Error('Method not implemented');
    }

    async getMessage(user_id: string, chat_id: string, message_id: string) {
        throw new Error('Method not implemented');
    }

    async updateMessage(
        user_id: string,
        chat_id: string,
        message_id: string,
        dto: update_message_dto
    ) {
        throw new Error('Method not implemented');
    }

    async deleteMessage(user_id: string, chat_id: string, message_id: string) {
        throw new Error('Method not implemented');
    }

    async markMessagesAsRead(user_id: string, chat_id: string, dto: mark_messages_read_dto) {
        throw new Error('Method not implemented');
    }
}
