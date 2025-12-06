import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CreateChatDto, MarkMessagesReadDto } from './dto';
import { NotFoundException } from '@nestjs/common';

describe('ChatController', () => {
    let controller: ChatController;
    let mock_chat_service: jest.Mocked<ChatService>;
    const mock_user_id = 'user-123';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ChatController],
            providers: [
                {
                    provide: ChatService,
                    useValue: {
                        createChat: jest.fn(),
                        getChats: jest.fn(),
                        getChat: jest.fn(),
                        deleteChat: jest.fn(),
                        sendMessage: jest.fn(),
                        getMessages: jest.fn(),
                        getMessage: jest.fn(),
                        updateMessage: jest.fn(),
                        deleteMessage: jest.fn(),
                        markMessagesAsRead: jest.fn(),
                        searchChats: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ChatController>(ChatController);
        mock_chat_service = module.get(ChatService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createChat', () => {
        it('should create a new chat', async () => {
            const mock_user_id = 'user-123';
            const mock_dto: CreateChatDto = {
                recipient_id: 'user-456',
            } as CreateChatDto;
            const mock_result = { chat_id: 'chat-1', message: 'Chat created' };

            mock_chat_service.createChat.mockResolvedValue(mock_result as any);

            const result = await controller.createChat(mock_dto, mock_user_id);

            expect(mock_chat_service.createChat).toHaveBeenCalledWith(mock_user_id, mock_dto);
            expect(result).toEqual(mock_result);
        });
    });

    describe('getChats', () => {
        it('should return chats list', async () => {
            const mock_user_id = 'user-123';
            const mock_query = { page: 1, limit: 20 };
            const mock_result = { data: [], pagination: {} };

            mock_chat_service.getChats.mockResolvedValue(mock_result as any);

            const result = await controller.getChats(mock_query as any, mock_user_id);

            expect(mock_chat_service.getChats).toHaveBeenCalledWith(mock_user_id, mock_query);
            expect(result).toEqual(mock_result);
        });
    });

    describe('markMessagesAsRead', () => {
        it('should mark messages as read', async () => {
            const mock_chat_id = 'chat-1';
            const mock_dto: MarkMessagesReadDto = {} as MarkMessagesReadDto;
            const mock_result = {
                chat_id: mock_chat_id,
                messages_marked_read: 5,
                read_at: new Date(),
            };

            mock_chat_service.markMessagesAsRead.mockResolvedValue(mock_result as any);

            const result = await controller.markMessagesAsRead(
                mock_chat_id,
                mock_dto,
                mock_user_id
            );

            expect(mock_chat_service.markMessagesAsRead).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_dto
            );
            expect(result).toEqual(mock_result);
        });

        it('should handle errors when marking messages as read', async () => {
            const mock_chat_id = 'chat-1';
            const mock_dto: MarkMessagesReadDto = {} as MarkMessagesReadDto;

            mock_chat_service.markMessagesAsRead.mockRejectedValue(
                new NotFoundException('Chat not found')
            );

            await expect(
                controller.markMessagesAsRead(mock_chat_id, mock_dto, mock_user_id)
            ).rejects.toThrow(NotFoundException);
        });
    });
});
