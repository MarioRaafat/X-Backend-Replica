import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import {
    CreateChatDto,
    GetChatsQueryDto,
    GetMessagesQueryDto,
    MarkMessagesReadDto,
    SearchChatsQueryDto,
    SendMessageDto,
    UpdateMessageDto,
} from './dto';

describe('ChatService', () => {
    let service: ChatService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ChatService],
        }).compile();

        service = module.get<ChatService>(ChatService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createChat', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const dto = new CreateChatDto();

            await expect(service.createChat(user_id, dto)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('getChats', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const query = new GetChatsQueryDto();

            await expect(service.getChats(user_id, query)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('getChat', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';

            await expect(service.getChat(user_id, chat_id)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('deleteChat', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';

            await expect(service.deleteChat(user_id, chat_id)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('searchChats', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const query = new SearchChatsQueryDto();

            await expect(service.searchChats(user_id, query)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('sendMessage', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';
            const dto = new SendMessageDto();

            await expect(service.sendMessage(user_id, chat_id, dto)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('getMessages', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';
            const query = new GetMessagesQueryDto();

            await expect(service.getMessages(user_id, chat_id, query)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('getMessage', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';
            const message_id = 'message123';

            await expect(service.getMessage(user_id, chat_id, message_id)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('updateMessage', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';
            const message_id = 'message123';
            const dto = new UpdateMessageDto();

            await expect(service.updateMessage(user_id, chat_id, message_id, dto)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('deleteMessage', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';
            const message_id = 'message123';

            await expect(service.deleteMessage(user_id, chat_id, message_id)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });

    describe('markMessagesAsRead', () => {
        it('should throw "Method not implemented" error', async () => {
            const user_id = 'user123';
            const chat_id = 'chat123';
            const dto = new MarkMessagesReadDto();

            await expect(service.markMessagesAsRead(user_id, chat_id, dto)).rejects.toThrow(
                'Method not implemented'
            );
        });
    });
});
