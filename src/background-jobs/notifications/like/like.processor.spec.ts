import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { LikeProcessor } from './like.processor';
import { NotificationsGateway } from 'src/notifications/gateway';
import { User } from 'src/user/entities';
import { LikeBackGroundNotificationJobDTO } from './like.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('LikeProcessor', () => {
    let processor: LikeProcessor;
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

    const mock_job_data: LikeBackGroundNotificationJobDTO = {
        like_to: 'user-123',
        liked_by: 'user-456',
        tweet: {} as any,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LikeProcessor,
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

        processor = module.get<LikeProcessor>(LikeProcessor);
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

    describe('handleSendLikeNotification', () => {
        it('should process like notification job successfully', async () => {
            user_repository.findOne.mockResolvedValueOnce(mock_user as User);

            const mock_job: Partial<Job<LikeBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendLikeNotification(
                mock_job as Job<LikeBackGroundNotificationJobDTO>
            );

            expect(user_repository.findOne).toHaveBeenCalledWith({
                where: { id: mock_job_data.liked_by },
                select: ['id', 'username', 'email', 'name', 'avatar_url'],
            });

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.LIKE,
                mock_job_data.like_to,
                {
                    type: NotificationType.LIKE,
                    ...mock_job_data,
                    liker: mock_user,
                }
            );
        });

        it('should log warning when liker user is not found', async () => {
            user_repository.findOne.mockResolvedValueOnce(null);

            const mock_job: Partial<Job<LikeBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendLikeNotification(
                mock_job as Job<LikeBackGroundNotificationJobDTO>
            );

            expect(logger_warn_spy).toHaveBeenCalledWith(
                `Liker with ID ${mock_job_data.liked_by} not found.`
            );
            expect(notifications_gateway.sendToUser).not.toHaveBeenCalled();
        });

        it('should handle errors and log them', async () => {
            const error = new Error('Database error');
            user_repository.findOne.mockRejectedValueOnce(error);

            const mock_job: Partial<Job<LikeBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendLikeNotification(
                    mock_job as Job<LikeBackGroundNotificationJobDTO>
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

            const mock_job: Partial<Job<LikeBackGroundNotificationJobDTO>> = {
                id: 'job-456',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendLikeNotification(
                    mock_job as Job<LikeBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalled();
        });
    });
});
