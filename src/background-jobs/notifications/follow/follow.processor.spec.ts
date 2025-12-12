import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FollowProcessor } from './follow.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { FollowBackGroundNotificationJobDTO } from './follow.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/user/entities';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

describe('FollowProcessor', () => {
    let processor: FollowProcessor;
    let notifications_service: jest.Mocked<NotificationsService>;
    let logger_spy: jest.SpyInstance;

    const mock_job_data: FollowBackGroundNotificationJobDTO = {
        followed_id: 'user-123',
        follower_id: 'user-456',
        follower_name: 'John Doe',
        action: 'add',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FollowProcessor,
                {
                    provide: NotificationsService,
                    useValue: {
                        removeFollowNotification: jest
                            .fn()
                            .mockResolvedValue('notification-id-123'),
                        sendNotificationOnly: jest.fn(),
                        saveNotificationAndSend: jest.fn(),
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

        processor = module.get<FollowProcessor>(FollowProcessor);
        notifications_service = module.get(NotificationsService);

        logger_spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        logger_spy.mockRestore();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleSendFollowNotification', () => {
        it('should process follow notification job successfully', async () => {
            const mock_job: Partial<Job<FollowBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await processor.handleSendFollowNotification(
                mock_job as Job<FollowBackGroundNotificationJobDTO>
            );

            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                mock_job_data.followed_id,
                expect.objectContaining({
                    type: NotificationType.FOLLOW,
                    follower_id: mock_job_data.follower_id,
                }),
                expect.objectContaining({
                    type: NotificationType.FOLLOW,
                    action: mock_job_data.action,
                    follower_id: mock_job_data.follower_id,
                })
            );
        });

        it('should handle errors and log them', async () => {
            const error = new Error('Notification gateway error');
            notifications_service.saveNotificationAndSend.mockRejectedValueOnce(error);

            const mock_job: Partial<Job<FollowBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: mock_job_data,
            };

            await expect(
                processor.handleSendFollowNotification(
                    mock_job as Job<FollowBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow(error);

            expect(logger_spy).toHaveBeenCalledWith(
                `Error processing follow notification job ${mock_job.id}:`,
                error
            );
        });

        it('should process follow notification with different action types', async () => {
            const unfollow_data: FollowBackGroundNotificationJobDTO = {
                ...mock_job_data,
                action: 'remove',
            };

            const mock_job: Partial<Job<FollowBackGroundNotificationJobDTO>> = {
                id: 'job-456',
                data: unfollow_data,
            };

            await processor.handleSendFollowNotification(
                mock_job as Job<FollowBackGroundNotificationJobDTO>
            );

            expect(notifications_service.removeFollowNotification).toHaveBeenCalledWith(
                unfollow_data.followed_id,
                unfollow_data.follower_id
            );
            expect(notifications_service.sendNotificationOnly).toHaveBeenCalledWith(
                NotificationType.FOLLOW,
                unfollow_data.followed_id,
                {
                    id: 'notification-id-123',
                    action: 'remove',
                }
            );
        });

        it('should handle jobs with missing optional fields', async () => {
            const minimal_data: FollowBackGroundNotificationJobDTO = {
                followed_id: 'user-123',
                follower_id: 'user-456',
                follower_name: 'Jane Doe',
                action: 'add',
            };

            const mock_job: Partial<Job<FollowBackGroundNotificationJobDTO>> = {
                id: 'job-789',
                data: minimal_data,
            };

            await processor.handleSendFollowNotification(
                mock_job as Job<FollowBackGroundNotificationJobDTO>
            );

            expect(notifications_service.saveNotificationAndSend).toHaveBeenCalledWith(
                minimal_data.followed_id,
                expect.objectContaining({
                    type: NotificationType.FOLLOW,
                    follower_id: minimal_data.follower_id,
                }),
                expect.objectContaining({
                    type: NotificationType.FOLLOW,
                    action: minimal_data.action,
                    follower_id: minimal_data.follower_id,
                    follower_name: minimal_data.follower_name,
                })
            );
        });
    });
});
