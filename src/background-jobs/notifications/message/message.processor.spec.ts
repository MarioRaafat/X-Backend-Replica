import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { MessageProcessor } from './message.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { User } from 'src/user/entities';
import { Message } from 'src/messages/entities/message.entity';
import { MessageBackGroundNotificationJobDTO } from './message.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('MessageProcessor', () => {
    let processor: MessageProcessor;
    let notifications_service: jest.Mocked<NotificationsService>;
    let user_repository: jest.Mocked<Repository<User>>;
    let logger_spy: jest.SpyInstance;
    let logger_warn_spy: jest.SpyInstance;

    const mock_user: Partial<User> = {
        id: 'user-456',
        username: 'johndoe',
        email: 'john@example.com',
        name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
    };

    const mock_job_data: MessageBackGroundNotificationJobDTO = {
        sent_to: 'user-123',
        sent_by: 'user-456',
        message: {} as any,
        message_id: 'message-123',
        chat_id: 'chat-123',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessageProcessor,
                {
                    provide: NotificationsService,
                    useValue: {
                        saveNotificationAndSend: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Message),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<MessageProcessor>(MessageProcessor);
        notifications_service = module.get(NotificationsService);
        user_repository = module.get(getRepositoryToken(User));

        logger_spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
        logger_warn_spy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        logger_spy.mockRestore();
        logger_warn_spy.mockRestore();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleSendMessageNotification', () => {
        it('should process message notification job successfully', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);

            const mock_job: Partial<Job<MessageBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendMessageNotification(
                mock_job as Job<MessageBackGroundNotificationJobDTO>
            );

            expect(user_repository.findOne).toHaveBeenCalledWith({
                where: { id: mock_job_data.sent_by },
                select: ['id', 'username', 'email', 'name', 'avatar_url'],
            });

            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                mock_job_data.sent_to,
                expect.objectContaining({
                    type: NotificationType.MESSAGE,
                    sent_by: mock_job_data.sent_by,
                    chat_id: mock_job_data.chat_id,
                }),
                expect.objectContaining({
                    type: NotificationType.MESSAGE,
                    sender: mock_user,
                })
            );
        });

        it('should log warning when sender user is not found', async () => {
            user_repository.findOne.mockResolvedValueOnce(null);

            const mock_job: Partial<Job<MessageBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendMessageNotification(
                mock_job as Job<MessageBackGroundNotificationJobDTO>
            );

            expect(logger_warn_spy).toHaveBeenCalledWith(
                `Sender with ID ${mock_job_data.sent_by} not found.`
            );
            expect(notifications_service.saveNotificationAndSend).not.toHaveBeenCalled();
        });

        it('should handle errors and log them', async () => {
            const error = new Error('Database error');
            user_repository.findOne.mockRejectedValueOnce(error);

            const mock_job: Partial<Job<MessageBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendMessageNotification(
                    mock_job as Job<MessageBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalledWith(
                `Error processing message job ${mock_job.id}:`,
                error
            );
        });

        it('should handle notification gateway errors', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);
            const error = new Error('Gateway error');
            notifications_service.saveNotificationAndSend.mockRejectedValueOnce(error);

            const mock_job: Partial<Job<MessageBackGroundNotificationJobDTO>> = {
                id: 'job-456',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendMessageNotification(
                    mock_job as Job<MessageBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalled();
        });
    });
});
