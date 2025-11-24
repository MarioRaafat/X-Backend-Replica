import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { LikeJobService } from './like.service';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { LikeBackGroundNotificationJobDTO } from './like.dto';

describe('LikeJobService', () => {
    let service: LikeJobService;
    let mock_queue: any;

    const mock_like_dto: LikeBackGroundNotificationJobDTO = {
        like_to: 'user-123',
        liked_by: 'user-456',
        tweet: {} as any,
    };

    beforeEach(async () => {
        mock_queue = {
            add: jest.fn().mockResolvedValue({ id: 'job-123' }),
            process: jest.fn(),
            on: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LikeJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<LikeJobService>(LikeJobService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueLikeNotification', () => {
        it('should queue a like notification job successfully', async () => {
            const result = await service.queueLikeNotification(mock_like_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.LIKE,
                mock_like_dto,
                {
                    priority: JOB_PRIORITIES.HIGH,
                    delay: JOB_DELAYS.IMMEDIATE,
                }
            );
            expect(result).toEqual({ id: 'job-123' });
        });

        it('should queue a like notification job with custom priority', async () => {
            const custom_priority = 1;
            const result = await service.queueLikeNotification(mock_like_dto, custom_priority);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.LIKE,
                mock_like_dto,
                {
                    priority: custom_priority,
                    delay: JOB_DELAYS.IMMEDIATE,
                }
            );
            expect(result).toEqual({ id: 'job-123' });
        });

        it('should queue a like notification job with custom delay', async () => {
            const custom_delay = 5000;
            const result = await service.queueLikeNotification(
                mock_like_dto,
                undefined,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.LIKE,
                mock_like_dto,
                {
                    priority: JOB_PRIORITIES.HIGH,
                    delay: custom_delay,
                }
            );
            expect(result).toEqual({ id: 'job-123' });
        });

        it('should queue a like notification job with both custom priority and delay', async () => {
            const custom_priority = 2;
            const custom_delay = 3000;
            const result = await service.queueLikeNotification(
                mock_like_dto,
                custom_priority,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.LIKE,
                mock_like_dto,
                {
                    priority: custom_priority,
                    delay: custom_delay,
                }
            );
            expect(result).toEqual({ id: 'job-123' });
        });

        it('should handle queue errors gracefully', async () => {
            const error = new Error('Queue error');
            mock_queue.add.mockRejectedValueOnce(error);

            await expect(service.queueLikeNotification(mock_like_dto)).rejects.toThrow();
        });
    });
});
