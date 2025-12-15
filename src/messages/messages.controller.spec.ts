import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';
import { MessageType } from './entities/message.entity';

describe('MessagesController', () => {
    let controller: MessagesController;
    let messages_service: jest.Mocked<MessagesService>;

    const mock_user_id = 'user-123';
    const mock_chat_id = 'chat-456';
    const mock_message_id = 'message-789';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MessagesController],
            providers: [
                {
                    provide: MessagesService,
                    useValue: {
                        sendMessage: jest.fn(),
                        getMessages: jest.fn(),
                        updateMessage: jest.fn(),
                        deleteMessage: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<MessagesController>(MessagesController);
        messages_service = module.get(MessagesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('sendMessage', () => {
        it('should send a message successfully', async () => {
            const send_dto: SendMessageDto = {
                content: 'Hello World',
                message_type: MessageType.TEXT,
            };
            const mock_result = {
                id: mock_message_id,
                content: 'Hello World',
                message_type: MessageType.TEXT,
                sender_id: mock_user_id,
                chat_id: mock_chat_id,
                is_read: false,
                created_at: new Date(),
                recipient_id: 'recipient-123',
            };

            messages_service.sendMessage.mockResolvedValue(mock_result as any);

            const result = await controller.sendMessage(mock_chat_id, send_dto, mock_user_id);

            expect(messages_service.sendMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                send_dto
            );
            expect(result).toEqual(mock_result);
        });

        it('should handle reply messages', async () => {
            const reply_dto: SendMessageDto = {
                content: 'Reply message',
                message_type: MessageType.REPLY,
                reply_to_message_id: 'original-message-id',
            };
            const mock_result = {
                id: mock_message_id,
                content: 'Reply message',
                message_type: MessageType.REPLY,
                reply_to_message_id: 'original-message-id',
                sender_id: mock_user_id,
                chat_id: mock_chat_id,
                recipient_id: 'recipient-123',
            };

            messages_service.sendMessage.mockResolvedValue(mock_result as any);

            const result = await controller.sendMessage(mock_chat_id, reply_dto, mock_user_id);

            expect(messages_service.sendMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                reply_dto
            );
            expect(result).toEqual(mock_result);
        });
    });

    describe('getMessages', () => {
        it('should get messages for a chat', async () => {
            const query: GetMessagesQueryDto = { limit: 50 };
            const mock_result = {
                sender: {
                    id: 'other-user',
                    username: 'otheruser',
                    name: 'Other User',
                    avatar_url: 'avatar.jpg',
                },
                messages: [
                    {
                        id: mock_message_id,
                        content: 'Test message',
                        message_type: MessageType.TEXT,
                        is_read: false,
                        is_edited: false,
                        created_at: new Date(),
                        sender: {
                            id: mock_user_id,
                            username: 'testuser',
                            name: 'Test User',
                            avatar_url: 'avatar.jpg',
                        },
                    },
                ],
            };

            messages_service.getMessages.mockResolvedValue(mock_result as any);

            const result = await controller.getMessages(mock_chat_id, query, mock_user_id);

            expect(messages_service.getMessages).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                query
            );
            expect(result).toEqual({
                data: {
                    chat_id: mock_chat_id,
                    ...mock_result,
                },
                pagination: {
                    next_cursor: undefined,
                    has_more: undefined,
                },
            });
            expect(result.data.messages).toHaveLength(1);
        });

        it('should handle pagination with before cursor', async () => {
            const query: GetMessagesQueryDto = { limit: 20, cursor: '2024-01-01T00:00:00Z' };
            const mock_result = {
                sender: {
                    id: 'other-user',
                    username: 'otheruser',
                    name: 'Other User',
                    avatar_url: null,
                },
                messages: [],
            };

            messages_service.getMessages.mockResolvedValue(mock_result as any);

            await controller.getMessages(mock_chat_id, query, mock_user_id);

            expect(messages_service.getMessages).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                query
            );
        });
    });

    describe('updateMessage', () => {
        it('should update a message successfully', async () => {
            const update_dto: UpdateMessageDto = { content: 'Updated content' };
            const mock_result = {
                id: mock_message_id,
                content: 'Updated content',
                message_type: MessageType.TEXT,
                updated_at: new Date(),
                is_edited: true,
                recipient_id: 'recipient-123',
            };

            messages_service.updateMessage.mockResolvedValue(mock_result as any);

            const result = await controller.updateMessage(
                mock_chat_id,
                mock_message_id,
                update_dto,
                mock_user_id
            );

            expect(messages_service.updateMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id,
                update_dto
            );
            expect(result).toEqual(mock_result);
            expect(result.is_edited).toBe(true);
        });
    });

    describe('deleteMessage', () => {
        it('should delete a message successfully', async () => {
            const mock_result = {
                id: mock_message_id,
                is_deleted: true,
                deleted_at: new Date(),
                recipient_id: 'recipient-123',
            };

            messages_service.deleteMessage.mockResolvedValue(mock_result as any);

            const result = await controller.deleteMessage(
                mock_chat_id,
                mock_message_id,
                mock_user_id
            );

            expect(messages_service.deleteMessage).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id
            );
            expect(result).toEqual(mock_result);
            expect(result.is_deleted).toBe(true);
        });
    });

    describe('socketDocs', () => {
        it('should return socket documentation', async () => {
            const result = await controller.socketDocs();

            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
    });

    describe('uploadMessageImage', () => {
        beforeEach(() => {
            messages_service.uploadMessageImage = jest.fn();
        });

        it('should upload message image successfully', async () => {
            const mock_file = {
                fieldname: 'file',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('test'),
                size: 1024,
            } as Express.Multer.File;

            const mock_result = {
                image_url: 'https://storage.azure.com/images/test.jpg',
            };

            messages_service.uploadMessageImage.mockResolvedValue(mock_result);

            const result = await controller.uploadMessageImage(mock_file, mock_user_id);

            expect(messages_service.uploadMessageImage).toHaveBeenCalledWith(
                mock_user_id,
                mock_file
            );
            expect(result).toEqual(mock_result);
        });

        it('should handle upload errors', async () => {
            const mock_file = {
                fieldname: 'file',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('test'),
                size: 1024,
            } as Express.Multer.File;

            messages_service.uploadMessageImage.mockRejectedValue(new Error('Upload failed'));

            await expect(controller.uploadMessageImage(mock_file, mock_user_id)).rejects.toThrow(
                'Upload failed'
            );
        });
    });

    describe('getMessageReactions', () => {
        beforeEach(() => {
            messages_service.getMessageReactions = jest.fn();
        });

        it('should get message reactions successfully', async () => {
            const mock_reactions = [
                {
                    emoji: '❤️',
                    count: 2,
                    users: [
                        {
                            id: 'user-1',
                            username: 'user1',
                            name: 'User One',
                            avatar_url: 'avatar1.jpg',
                        },
                        {
                            id: 'user-2',
                            username: 'user2',
                            name: 'User Two',
                            avatar_url: 'avatar2.jpg',
                        },
                    ],
                    user_reacted: true,
                },
            ];

            messages_service.getMessageReactions.mockResolvedValue(mock_reactions as any);

            const result = await controller.getMessageReactions(
                mock_chat_id,
                mock_message_id,
                mock_user_id
            );

            expect(messages_service.getMessageReactions).toHaveBeenCalledWith(
                mock_user_id,
                mock_chat_id,
                mock_message_id
            );
            expect(result).toEqual(mock_reactions);
        });

        it('should return empty array when no reactions', async () => {
            messages_service.getMessageReactions.mockResolvedValue([]);

            const result = await controller.getMessageReactions(
                mock_chat_id,
                mock_message_id,
                mock_user_id
            );

            expect(result).toEqual([]);
        });
    });

    describe('uploadVoiceNote', () => {
        beforeEach(() => {
            messages_service.uploadVoiceNote = jest.fn();
        });

        it('should upload voice note successfully', async () => {
            const mock_file = {
                fieldname: 'file',
                originalname: 'voice.mp3',
                encoding: '7bit',
                mimetype: 'audio/mpeg',
                buffer: Buffer.from('audio data'),
                size: 5000,
            } as Express.Multer.File;

            const mock_body = { duration: '45' };
            const mock_result = {
                voice_note_url: 'https://storage.azure.com/voices/voice.mp3',
                duration: '45',
            };

            messages_service.uploadVoiceNote.mockResolvedValue(mock_result);

            const result = await controller.uploadVoiceNote(mock_file, mock_body, mock_user_id);

            expect(messages_service.uploadVoiceNote).toHaveBeenCalledWith(
                mock_user_id,
                mock_file,
                '45'
            );
            expect(result).toEqual(mock_result);
        });

        it('should handle voice note upload errors', async () => {
            const mock_file = {
                fieldname: 'file',
                originalname: 'voice.mp3',
                encoding: '7bit',
                mimetype: 'audio/mpeg',
                buffer: Buffer.from('audio data'),
                size: 5000,
            } as Express.Multer.File;

            const mock_body = { duration: '30' };

            messages_service.uploadVoiceNote.mockRejectedValue(new Error('File too large'));

            await expect(
                controller.uploadVoiceNote(mock_file, mock_body, mock_user_id)
            ).rejects.toThrow('File too large');
        });
    });
});
