import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { ReplyProcessor } from './reply.processor';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { User } from 'src/user/entities';
import { ReplyBackGroundNotificationJobDTO } from './reply.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('ReplyProcessor', () => {
    let processor: ReplyProcessor;
    let notifications_gateway: jest.Mocked<NotificationsGateway>;
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

    const mock_job_data: ReplyBackGroundNotificationJobDTO = {
        reply_to: 'user-123',
        replied_by: 'user-456',
        tweet: {} as any,
        reply_tweet_id: 'reply-tweet-123',
        original_tweet_id: 'original-tweet-123',
        conversation_id: 'conversation-123',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReplyProcessor,
                {
                    provide: NotificationsGateway,
                    useValue: {
                        sendToUser: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<ReplyProcessor>(ReplyProcessor);
        notifications_gateway = module.get(NotificationsGateway);
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

    describe('handleSendReplyNotification', () => {
        it('should process reply notification job successfully', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(user_repository.findOne).toHaveBeenCalledWith({
                where: { id: mock_job_data.replied_by },
                select: ['id', 'username', 'email', 'name', 'avatar_url'],
            });

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.REPLY,
                mock_job_data.reply_to,
                {
                    type: NotificationType.REPLY,
                    ...mock_job_data,
                    replier: mock_user,
                }
            );
        });

        it('should log warning when replier user is not found', async () => {
            user_repository.findOne.mockResolvedValueOnce(null);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(logger_warn_spy).toHaveBeenCalledWith(
                `Replier with ID ${mock_job_data.replied_by} not found.`
            );
            expect(notifications_gateway.sendToUser).not.toHaveBeenCalled();
        });

        it('should handle errors and log them', async () => {
            const error = new Error('Database error');
            user_repository.findOne.mockRejectedValueOnce(error);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendReplyNotification(
                    mock_job as Job<ReplyBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalledWith(
                `Error processing reply job ${mock_job.id}:`,
                error
            );
        });

        it('should handle notification gateway errors', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);
            const error = new Error('Gateway error');
            notifications_gateway.sendToUser.mockImplementation(() => {
                throw error;
            });

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-456',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendReplyNotification(
                    mock_job as Job<ReplyBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalled();
        });

        it('should handle missing user details gracefully', async () => {
            const incomplete_user: Partial<User> = {
                id: 'user-456',
                username: 'johndoe',
            };
            user_repository.findOne.mockResolvedValueOnce(incomplete_user as User);

            const mock_job: Partial<Job<ReplyBackGroundNotificationJobDTO>> = {
                id: 'job-789',
                data: mock_job_data,
            };

            await processor.handleSendReplyNotification(
                mock_job as Job<ReplyBackGroundNotificationJobDTO>
            );

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.REPLY,
                mock_job_data.reply_to,
                expect.objectContaining({
                    type: NotificationType.REPLY,
                    replier: incomplete_user,
                })
            );
        });
    });
});
