import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FollowProcessor } from './follow.processor';
import { NotificationsGateway } from 'src/notifications/gateway';
import { FollowBackGroundNotificationJobDTO } from './follow.dto';
import { NotificationType } from 'src/notifications/enums/notification-types';

describe('FollowProcessor', () => {
    let processor: FollowProcessor;
    let notifications_gateway: jest.Mocked<NotificationsGateway>;
    let logger_spy: jest.SpyInstance;

    const mock_job_data: FollowBackGroundNotificationJobDTO = {
        followed_id: 'user-123',
        follower_id: 'user-456',
        followed_avatar_url: 'https://example.com/avatar.jpg',
        follower_name: 'John Doe',
        action: 'add',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FollowProcessor,
                {
                    provide: NotificationsGateway,
                    useValue: {
                        sendToUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<FollowProcessor>(FollowProcessor);
        notifications_gateway = module.get(NotificationsGateway);

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

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.FOLLOW,
                mock_job_data.followed_id,
                {
                    type: 'follow',
                    action: mock_job_data.action,
                    follower_id: mock_job_data.follower_id,
                    follower_name: mock_job_data.follower_name,
                    followed_avatar_url: mock_job_data.followed_avatar_url,
                }
            );
        });

        it('should handle errors and log them', async () => {
            const error = new Error('Notification gateway error');
            notifications_gateway.sendToUser.mockImplementation(() => {
                throw error;
            });

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
                `Error processing OTP email job ${mock_job.id}:`,
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

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.FOLLOW,
                unfollow_data.followed_id,
                {
                    type: 'follow',
                    action: 'remove',
                    follower_id: unfollow_data.follower_id,
                    follower_name: unfollow_data.follower_name,
                    followed_avatar_url: unfollow_data.followed_avatar_url,
                }
            );
        });

        it('should handle jobs with missing optional fields', async () => {
            const minimal_data: FollowBackGroundNotificationJobDTO = {
                followed_id: 'user-123',
                follower_id: 'user-456',
                followed_avatar_url: undefined,
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

            expect(notifications_gateway.sendToUser).toHaveBeenCalledWith(
                NotificationType.FOLLOW,
                minimal_data.followed_id,
                expect.objectContaining({
                    type: 'follow',
                    action: minimal_data.action,
                    follower_id: minimal_data.follower_id,
                    follower_name: minimal_data.follower_name,
                })
            );
        });
    });
});
