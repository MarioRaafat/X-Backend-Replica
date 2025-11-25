import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { FollowJobService } from './follow.service';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { FollowBackGroundNotificationJobDTO } from './follow.dto';

describe('FollowJobService', () => {
    let service: FollowJobService;
    let mock_queue: any;

    const mock_follow_dto: FollowBackGroundNotificationJobDTO = {
        followed_id: 'user-123',
        follower_id: 'user-456',
        followed_avatar_url: 'https://example.com/avatar.jpg',
        follower_name: 'John Doe',
        action: 'add',
    };

    beforeEach(async () => {
        mock_queue = {
            add: jest.fn().mockResolvedValue({ id: 'job-123' }),
            process: jest.fn(),
            on: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FollowJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<FollowJobService>(FollowJobService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueFollowNotification', () => {
        it('should queue a follow notification job successfully', async () => {
            const result = await service.queueFollowNotification(mock_follow_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.FOLLOW,
                mock_follow_dto,
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

        it('should queue a follow notification job with custom priority', async () => {
            const custom_priority = 1;
            const result = await service.queueFollowNotification(mock_follow_dto, custom_priority);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.FOLLOW,
                mock_follow_dto,
                expect.objectContaining({
                    priority: custom_priority,
                    delay: JOB_DELAYS.IMMEDIATE,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue a follow notification job with custom delay', async () => {
            const custom_delay = 5000;
            const result = await service.queueFollowNotification(
                mock_follow_dto,
                undefined,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.FOLLOW,
                mock_follow_dto,
                expect.objectContaining({
                    priority: JOB_PRIORITIES.HIGH,
                    delay: custom_delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue a follow notification job with both custom priority and delay', async () => {
            const custom_priority = 2;
            const custom_delay = 3000;
            const result = await service.queueFollowNotification(
                mock_follow_dto,
                custom_priority,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.FOLLOW,
                mock_follow_dto,
                expect.objectContaining({
                    priority: custom_priority,
                    delay: custom_delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should handle queue errors gracefully', async () => {
            const error = new Error('Queue error');
            mock_queue.add.mockRejectedValueOnce(error);

            const result = await service.queueFollowNotification(mock_follow_dto);
            expect(result).toEqual({ success: false, error: 'Queue error' });
        });
    });
});
