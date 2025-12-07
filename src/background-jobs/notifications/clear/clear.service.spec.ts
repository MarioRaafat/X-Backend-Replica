import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ClearJobService } from './clear.service';
import { QUEUE_NAMES } from '../../constants/queue.constants';
import { ClearBackGroundNotificationJobDTO } from './clear.dto';

describe('ClearJobService', () => {
    let service: ClearJobService;
    let queue: jest.Mocked<Queue>;

    beforeEach(async () => {
        const mock_queue = {
            add: jest.fn(),
            getJob: jest.fn(),
            getJobs: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClearJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<ClearJobService>(ClearJobService);
        queue = module.get(getQueueToken(QUEUE_NAMES.NOTIFICATION));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueClearNotification', () => {
        it('should successfully queue a clear notification job with default priority and delay', async () => {
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-123',
                tweet_ids: ['tweet-1', 'tweet-2'],
            };

            const mock_job = { id: 'job-123', data: dto };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueClearNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue clear notification job with custom priority', async () => {
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-456',
                tweet_ids: ['tweet-3'],
            };

            const custom_priority = 5;
            const mock_job = { id: 'job-456', data: dto };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueClearNotification(dto, custom_priority);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-456' });
        });

        it('should queue clear notification job with custom delay', async () => {
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-789',
                tweet_ids: ['tweet-4', 'tweet-5', 'tweet-6'],
            };

            const custom_delay = 5000;
            const mock_job = { id: 'job-789', data: dto };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueClearNotification(dto, undefined, custom_delay);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-789' });
        });

        it('should queue clear notification job with both custom priority and delay', async () => {
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-custom',
                tweet_ids: ['tweet-x', 'tweet-y'],
            };

            const custom_priority = 3;
            const custom_delay = 10000;
            const mock_job = { id: 'job-custom', data: dto };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueClearNotification(dto, custom_priority, custom_delay);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-custom' });
        });

        it('should handle queue errors and return error object', async () => {
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-error',
                tweet_ids: ['tweet-error'],
            };

            const error = new Error('Queue error');
            queue.add.mockRejectedValue(error);

            const result = await service.queueClearNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: false, error: 'Queue error' });
        });

        it('should handle empty tweet_ids array', async () => {
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-empty',
                tweet_ids: [],
            };

            const mock_job = { id: 'job-empty', data: dto };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueClearNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-empty' });
        });

        it('should handle large tweet_ids array', async () => {
            const large_tweet_ids = Array.from({ length: 100 }, (_, i) => `tweet-${i}`);
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-large',
                tweet_ids: large_tweet_ids,
            };

            const mock_job = { id: 'job-large', data: dto };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueClearNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-large' });
        });

        it('should handle single tweet_id in array', async () => {
            const dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-single',
                tweet_ids: ['tweet-single'],
            };

            const mock_job = { id: 'job-single', data: dto };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueClearNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-single' });
        });
    });
});
