import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CreateChatDto, MarkMessagesReadDto, SendMessageDto, UpdateMessageDto } from './dto';

describe('ChatController', () => {
    let controller: ChatController;
    let mock_chat_service: jest.Mocked<ChatService>;

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

    describe('getChat', () => {
        it('should return a specific chat', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';
            const mock_result = { chat_id: mock_chat_id, participants: [] };

            mock_chat_service.getChat.mockResolvedValue(mock_result as any);

            const result = await controller.getChat(mock_chat_id, mock_user_id);

            expect(mock_chat_service.getChat).toHaveBeenCalledWith(mock_user_id, mock_chat_id);
            expect(result).toEqual(mock_result);
        });
    });

    describe('deleteChat', () => {
        it('should delete a chat', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';

            mock_chat_service.deleteChat.mockResolvedValue(undefined);

            await controller.deleteChat(mock_chat_id, mock_user_id);

            expect(mock_chat_service.deleteChat).toHaveBeenCalledWith(mock_user_id, mock_chat_id);
        });
    });

    describe('sendMessage', () => {
        it('should send a message', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';
            const mock_dto: SendMessageDto = {
                content: 'Hello!',
            } as SendMessageDto;
            const mock_result = { message_id: 'msg-1', content: 'Hello!' };

            mock_chat_service.sendMessage.mockResolvedValue(mock_result as any);

            const result = await controller.sendMessage(mock_chat_id, mock_dto, mock_user_id);

            expect(mock_chat_service.sendMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_dto
            );
            expect(result).toEqual(mock_result);
        });
    });

    describe('getMessages', () => {
        it('should return messages for a chat', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';
            const mock_query = { page: 1, limit: 50 };
            const mock_result = { data: [], pagination: {} };

            mock_chat_service.getMessages.mockResolvedValue(mock_result as any);

            const result = await controller.getMessages(
                mock_chat_id,
                mock_query as any,
                mock_user_id
            );

            expect(mock_chat_service.getMessages).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_query
            );
            expect(result).toEqual(mock_result);
        });
    });

    describe('getMessage', () => {
        it('should return a specific message', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';
            const mock_message_id = 'msg-1';
            const mock_result = { message_id: mock_message_id, content: 'Hello' };

            mock_chat_service.getMessage.mockResolvedValue(mock_result as any);

            const result = await controller.getMessage(mock_chat_id, mock_message_id, mock_user_id);

            expect(mock_chat_service.getMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id
            );
            expect(result).toEqual(mock_result);
        });
    });

    describe('updateMessage', () => {
        it('should update a message', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';
            const mock_message_id = 'msg-1';
            const mock_dto: UpdateMessageDto = {
                content: 'Updated content',
            } as UpdateMessageDto;
            const mock_result = { message_id: mock_message_id, content: 'Updated content' };

            mock_chat_service.updateMessage.mockResolvedValue(mock_result as any);

            const result = await controller.updateMessage(
                mock_chat_id,
                mock_message_id,
                mock_dto,
                mock_user_id
            );

            expect(mock_chat_service.updateMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id,
                mock_dto
            );
            expect(result).toEqual(mock_result);
        });
    });

    describe('deleteMessage', () => {
        it('should delete a message', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';
            const mock_message_id = 'msg-1';

            mock_chat_service.deleteMessage.mockResolvedValue(undefined);

            await controller.deleteMessage(mock_chat_id, mock_message_id, mock_user_id);

            expect(mock_chat_service.deleteMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id
            );
        });
    });

    describe('markMessagesAsRead', () => {
        it('should mark messages as read', async () => {
            const mock_user_id = 'user-123';
            const mock_chat_id = 'chat-1';
            const mock_dto: MarkMessagesReadDto = {
                message_ids: ['msg-1', 'msg-2'],
            } as MarkMessagesReadDto;

            mock_chat_service.markMessagesAsRead.mockResolvedValue(undefined);

            await controller.markMessagesAsRead(mock_chat_id, mock_dto, mock_user_id);

            expect(mock_chat_service.markMessagesAsRead).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_dto
            );
        });
    });

    describe('searchChats', () => {
        it('should search chats', async () => {
            const mock_user_id = 'user-123';
            const mock_query = { query: 'test', page: 1, limit: 20 };
            const mock_result = { data: [], pagination: {} };

            mock_chat_service.searchChats.mockResolvedValue(mock_result as any);

            const result = await controller.searchChats(mock_query as any, mock_user_id);

            expect(mock_chat_service.searchChats).toHaveBeenCalledWith(mock_user_id, mock_query);
            expect(result).toEqual(mock_result);
        });
    });
});
