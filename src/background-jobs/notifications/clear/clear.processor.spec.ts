import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ClearProcessor } from './clear.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ClearBackGroundNotificationJobDTO } from './clear.dto';

describe('ClearProcessor', () => {
    let processor: ClearProcessor;
    let notifications_service: jest.Mocked<NotificationsService>;

    beforeEach(async () => {
        const mock_notifications_service = {
            deleteNotificationsByTweetIds: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClearProcessor,
                {
                    provide: NotificationsService,
                    useValue: mock_notifications_service,
                },
            ],
        }).compile();

        processor = module.get<ClearProcessor>(ClearProcessor);
        notifications_service = module.get(NotificationsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleClearNotification', () => {
        it('should successfully clear notifications for valid job data', async () => {
            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-123',
                tweet_ids: ['tweet-1', 'tweet-2', 'tweet-3'],
            };

            const job = {
                id: 'job-123',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            notifications_service.deleteNotificationsByTweetIds.mockResolvedValue(undefined);

            await processor.handleClearNotification(job);

            expect(notifications_service.deleteNotificationsByTweetIds).toHaveBeenCalledWith(
                'user-123',
                ['tweet-1', 'tweet-2', 'tweet-3']
            );
            expect(notifications_service.deleteNotificationsByTweetIds).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple tweet IDs', async () => {
            const tweet_ids = Array.from({ length: 50 }, (_, i) => `tweet-${i}`);
            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-456',
                tweet_ids,
            };

            const job = {
                id: 'job-456',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            notifications_service.deleteNotificationsByTweetIds.mockResolvedValue(undefined);

            await processor.handleClearNotification(job);

            expect(notifications_service.deleteNotificationsByTweetIds).toHaveBeenCalledWith(
                'user-456',
                tweet_ids
            );
        });

        it('should warn and return early if user_id is missing', async () => {
            const logger_warn_spy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

            const job_data = {
                user_id: '',
                tweet_ids: ['tweet-1'],
            } as ClearBackGroundNotificationJobDTO;

            const job = {
                id: 'job-invalid-1',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            await processor.handleClearNotification(job);

            expect(logger_warn_spy).toHaveBeenCalled();
            expect(notifications_service.deleteNotificationsByTweetIds).not.toHaveBeenCalled();

            logger_warn_spy.mockRestore();
        });

        it('should warn and return early if tweet_ids is empty', async () => {
            const logger_warn_spy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

            const job_data = {
                user_id: 'user-123',
                tweet_ids: [],
            } as ClearBackGroundNotificationJobDTO;

            const job = {
                id: 'job-invalid-2',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            await processor.handleClearNotification(job);

            expect(logger_warn_spy).toHaveBeenCalled();
            expect(notifications_service.deleteNotificationsByTweetIds).not.toHaveBeenCalled();

            logger_warn_spy.mockRestore();
        });

        it('should warn and return early if tweet_ids is missing', async () => {
            const logger_warn_spy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

            const job_data = {
                user_id: 'user-123',
                tweet_ids: null,
            } as any;

            const job = {
                id: 'job-invalid-3',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            await processor.handleClearNotification(job);

            expect(logger_warn_spy).toHaveBeenCalled();
            expect(notifications_service.deleteNotificationsByTweetIds).not.toHaveBeenCalled();

            logger_warn_spy.mockRestore();
        });

        it('should log error and throw if notifications_service.deleteNotificationsByTweetIds fails', async () => {
            const logger_error_spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
            const error = new Error('Database error');

            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-789',
                tweet_ids: ['tweet-1'],
            };

            const job = {
                id: 'job-error-1',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            notifications_service.deleteNotificationsByTweetIds.mockRejectedValue(error);

            await expect(processor.handleClearNotification(job)).rejects.toThrow('Database error');

            expect(logger_error_spy).toHaveBeenCalled();
            expect(notifications_service.deleteNotificationsByTweetIds).toHaveBeenCalledWith(
                'user-789',
                ['tweet-1']
            );

            logger_error_spy.mockRestore();
        });

        it('should handle console.log for clearing notifications', async () => {
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-999',
                tweet_ids: ['tweet-x', 'tweet-y'],
            };

            const job = {
                id: 'job-console',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            notifications_service.deleteNotificationsByTweetIds.mockResolvedValue(undefined);

            await processor.handleClearNotification(job);

            expect(console_spy).toHaveBeenCalledWith(
                'Clearing notifications for user:',
                'user-999',
                'Tweet IDs:',
                ['tweet-x', 'tweet-y']
            );

            console_spy.mockRestore();
        });

        it('should log success message after clearing notifications', async () => {
            const logger_log_spy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-success',
                tweet_ids: ['tweet-a', 'tweet-b', 'tweet-c'],
            };

            const job = {
                id: 'job-success',
                data: job_data,
            } as Job<ClearBackGroundNotificationJobDTO>;

            notifications_service.deleteNotificationsByTweetIds.mockResolvedValue(undefined);

            await processor.handleClearNotification(job);

            expect(logger_log_spy).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Successfully cleared 3 notification(s) by tweet IDs for user user-success'
                )
            );

            logger_log_spy.mockRestore();
        });
    });
});
