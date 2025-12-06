import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ClearJobService } from './clear.service';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { ClearBackGroundNotificationJobDTO } from './clear.dto';

describe('ClearJobService', () => {
    let service: ClearJobService;
    let mock_queue: any;

    const mock_clear_dto: ClearBackGroundNotificationJobDTO = {
        user_id: 'user-123',
        tweet_ids: ['tweet-1', 'tweet-2', 'tweet-3'],
    };

    beforeEach(async () => {
        mock_queue = {
            add: jest.fn().mockResolvedValue({ id: 'job-123' }),
            process: jest.fn(),
            on: jest.fn(),
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueClearNotification', () => {
        it('should queue a clear notification job successfully', async () => {
            const result = await service.queueClearNotification(mock_clear_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.CLEAR,
                mock_clear_dto,
                expect.objectContaining({
                    priority: JOB_PRIORITIES.HIGH,
                    delay: JOB_DELAYS.IMMEDIATE,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue a clear notification job with custom priority', async () => {
            const custom_priority = 1;
            const result = await service.queueClearNotification(mock_clear_dto, custom_priority);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.CLEAR,
                mock_clear_dto,
                expect.objectContaining({
                    priority: custom_priority,
                    delay: JOB_DELAYS.IMMEDIATE,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue a clear notification job with custom delay', async () => {
            const custom_delay = 5000;
            const result = await service.queueClearNotification(
                mock_clear_dto,
                undefined,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.CLEAR,
                mock_clear_dto,
                expect.objectContaining({
                    priority: JOB_PRIORITIES.HIGH,
                    delay: custom_delay,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should handle queue errors and log them', async () => {
            const error = new Error('Queue error');
            mock_queue.add.mockRejectedValue(error);

            const logger_spy = jest.spyOn(service['logger'], 'error');

            const result = await service.queueClearNotification(mock_clear_dto);

            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to queue clear notification job:',
                error
            );
            expect(result).toEqual({ success: false, error: error.message });
        });

        it('should handle queue with empty tweet_ids array', async () => {
            const empty_dto: ClearBackGroundNotificationJobDTO = {
                user_id: 'user-123',
                tweet_ids: [],
            };

            const result = await service.queueClearNotification(empty_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.CLEAR,
                empty_dto,
                expect.any(Object)
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });
    });
});
