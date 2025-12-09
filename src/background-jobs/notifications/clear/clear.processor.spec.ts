import { Test, TestingModule } from '@nestjs/testing';
import { ClearProcessor } from './clear.processor';
import { NotificationsService } from 'src/notifications/notifications.service';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ClearBackGroundNotificationJobDTO } from './clear.dto';

describe('ClearProcessor', () => {
    let processor: ClearProcessor;
    let mock_notifications_service: any;

    beforeEach(async () => {
        mock_notifications_service = {
            deleteNotificationsByTweetIds: jest.fn().mockResolvedValue(undefined),
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleClearNotification', () => {
        it('should process clear notification job successfully', async () => {
            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-123',
                tweet_ids: ['tweet-1', 'tweet-2', 'tweet-3'],
            };

            const mock_job: Partial<Job<ClearBackGroundNotificationJobDTO>> = {
                id: 'job-123',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'log');

            await processor.handleClearNotification(
                mock_job as Job<ClearBackGroundNotificationJobDTO>
            );

            expect(mock_notifications_service.deleteNotificationsByTweetIds).toHaveBeenCalledWith(
                'user-123',
                ['tweet-1', 'tweet-2', 'tweet-3']
            );
            expect(logger_spy).toHaveBeenCalledWith(
                'Successfully cleared 3 notification(s) by tweet IDs for user user-123'
            );
        });

        it('should handle job with single tweet_id', async () => {
            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-456',
                tweet_ids: ['tweet-single'],
            };

            const mock_job: Partial<Job<ClearBackGroundNotificationJobDTO>> = {
                id: 'job-456',
                data: job_data,
            };

            await processor.handleClearNotification(
                mock_job as Job<ClearBackGroundNotificationJobDTO>
            );

            expect(mock_notifications_service.deleteNotificationsByTweetIds).toHaveBeenCalledWith(
                'user-456',
                ['tweet-single']
            );
        });

        it('should warn and return early if user_id is missing', async () => {
            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: '',
                tweet_ids: ['tweet-1'],
            };

            const mock_job: Partial<Job<ClearBackGroundNotificationJobDTO>> = {
                id: 'job-789',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            await processor.handleClearNotification(
                mock_job as Job<ClearBackGroundNotificationJobDTO>
            );

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid job data for clear notification job job-789')
            );
            expect(mock_notifications_service.deleteNotificationsByTweetIds).not.toHaveBeenCalled();
        });

        it('should warn and return early if tweet_ids is empty', async () => {
            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-123',
                tweet_ids: [],
            };

            const mock_job: Partial<Job<ClearBackGroundNotificationJobDTO>> = {
                id: 'job-empty',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            await processor.handleClearNotification(
                mock_job as Job<ClearBackGroundNotificationJobDTO>
            );

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid job data for clear notification job job-empty')
            );
            expect(mock_notifications_service.deleteNotificationsByTweetIds).not.toHaveBeenCalled();
        });

        it('should warn and return early if tweet_ids is undefined', async () => {
            const job_data: any = {
                user_id: 'user-123',
                tweet_ids: undefined,
            };

            const mock_job: Partial<Job<ClearBackGroundNotificationJobDTO>> = {
                id: 'job-undefined',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'warn');

            await processor.handleClearNotification(
                mock_job as Job<ClearBackGroundNotificationJobDTO>
            );

            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid job data for clear notification job')
            );
            expect(mock_notifications_service.deleteNotificationsByTweetIds).not.toHaveBeenCalled();
        });

        it('should log error and rethrow if deleteNotificationsByTweetIds fails', async () => {
            const error = new Error('Database error');
            mock_notifications_service.deleteNotificationsByTweetIds.mockRejectedValue(error);

            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-123',
                tweet_ids: ['tweet-1'],
            };

            const mock_job: Partial<Job<ClearBackGroundNotificationJobDTO>> = {
                id: 'job-error',
                data: job_data,
            };

            const logger_spy = jest.spyOn(processor['logger'], 'error');

            await expect(
                processor.handleClearNotification(
                    mock_job as Job<ClearBackGroundNotificationJobDTO>
                )
            ).rejects.toThrow('Database error');

            expect(logger_spy).toHaveBeenCalledWith(
                'Error processing clear notification job job-error:',
                error
            );
        });

        it('should log console message when clearing notifications', async () => {
            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const job_data: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-123',
                tweet_ids: ['tweet-1', 'tweet-2'],
            };

            const mock_job: Partial<Job<ClearBackGroundNotificationJobDTO>> = {
                id: 'job-console',
                data: job_data,
            };

            await processor.handleClearNotification(
                mock_job as Job<ClearBackGroundNotificationJobDTO>
            );

            expect(console_spy).toHaveBeenCalledWith(
                'Clearing notifications for user:',
                'user-123',
                'Tweet IDs:',
                ['tweet-1', 'tweet-2']
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

            mock_notifications_service.deleteNotificationsByTweetIds.mockResolvedValue(undefined);

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
