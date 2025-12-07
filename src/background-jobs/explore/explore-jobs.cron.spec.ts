import { Test, TestingModule } from '@nestjs/testing';
import { ExploreJobsCron } from './explore-jobs.cron';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../constants/queue.constants';

describe('ExploreJobsCron', () => {
    let cron: ExploreJobsCron;
    let explore_queue: any;

    const mockQueue = {
        add: jest.fn(),
        getWaiting: jest.fn(),
        getActive: jest.fn(),
        getCompleted: jest.fn(),
        getFailed: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreJobsCron,
                { provide: getQueueToken(QUEUE_NAMES.EXPLORE), useValue: mockQueue },
            ],
        }).compile();

        cron = module.get<ExploreJobsCron>(ExploreJobsCron);
        explore_queue = module.get(getQueueToken(QUEUE_NAMES.EXPLORE));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(cron).toBeDefined();
    });

    describe('scheduleExploreScoreUpdate', () => {
        it('should schedule explore score update job with default config', async () => {
            const mockJob = { id: '1' };
            mockQueue.add.mockResolvedValue(mockJob);

            await cron.scheduleExploreScoreUpdate();

            expect(mockQueue.add).toHaveBeenCalledWith(
                'recalculate-explore-scores',
                expect.objectContaining({
                    force_all: false,
                }),
                expect.objectContaining({
                    attempts: expect.any(Number),
                    backoff: expect.any(Object),
                })
            );
        });

        it('should handle queue errors gracefully', async () => {
            mockQueue.add.mockRejectedValue(new Error('Queue is full'));

            await expect(cron.scheduleExploreScoreUpdate()).resolves.not.toThrow();
        });

        it('should log job id on successful scheduling', async () => {
            const mockJob = { id: '123' };
            mockQueue.add.mockResolvedValue(mockJob);

            await cron.scheduleExploreScoreUpdate();

            expect(mockQueue.add).toHaveBeenCalled();
        });
    });

    describe('triggerManualUpdate', () => {
        it('should trigger manual update with high priority', async () => {
            const mockJob = { id: '2', data: {} };
            mockQueue.add.mockResolvedValue(mockJob);

            const result = await cron.triggerManualUpdate();

            expect(result.success).toBe(true);
            expect(result.job_id).toBe('2');
            expect(result.params).toBeDefined();
            expect(mockQueue.add).toHaveBeenCalledWith(
                'recalculate-explore-scores',
                expect.any(Object),
                expect.objectContaining({
                    priority: expect.any(Number),
                })
            );
        });

        it('should return error on failure', async () => {
            mockQueue.add.mockRejectedValue(new Error('Failed to add job'));

            const result = await cron.triggerManualUpdate();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to add job');
        });

        it('should include job parameters in response', async () => {
            const mockJob = { id: '3' };
            mockQueue.add.mockResolvedValue(mockJob);

            const result = await cron.triggerManualUpdate();

            expect(result.params).toHaveProperty('since_hours');
            expect(result.params).toHaveProperty('max_age_hours');
            expect(result.params).toHaveProperty('batch_size');
            expect(result.params).toHaveProperty('force_all');
        });
    });

    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            const mockWaiting = [{ id: '1' }, { id: '2' }];
            const mockActive = [{ id: '3' }];
            const mockCompleted = [{ id: '4' }, { id: '5' }, { id: '6' }];
            const mockFailed = [{ id: '7' }];

            mockQueue.getWaiting.mockResolvedValue(mockWaiting);
            mockQueue.getActive.mockResolvedValue(mockActive);
            mockQueue.getCompleted.mockResolvedValue(mockCompleted);
            mockQueue.getFailed.mockResolvedValue(mockFailed);

            const stats = await cron.getQueueStats();

            expect(stats.waiting).toBe(2);
            expect(stats.active).toBe(1);
            expect(stats.completed).toBe(3);
            expect(stats.failed).toBe(1);
            expect(stats.total_jobs).toBe(7);
        });

        it('should handle empty queue', async () => {
            mockQueue.getWaiting.mockResolvedValue([]);
            mockQueue.getActive.mockResolvedValue([]);
            mockQueue.getCompleted.mockResolvedValue([]);
            mockQueue.getFailed.mockResolvedValue([]);

            const stats = await cron.getQueueStats();

            expect(stats.waiting).toBe(0);
            expect(stats.active).toBe(0);
            expect(stats.completed).toBe(0);
            expect(stats.failed).toBe(0);
            expect(stats.total_jobs).toBe(0);
        });

        it('should throw error when queue operation fails', async () => {
            mockQueue.getWaiting.mockRejectedValue(new Error('Redis connection failed'));

            await expect(cron.getQueueStats()).rejects.toThrow('Redis connection failed');
        });

        it('should call all queue methods', async () => {
            mockQueue.getWaiting.mockResolvedValue([]);
            mockQueue.getActive.mockResolvedValue([]);
            mockQueue.getCompleted.mockResolvedValue([]);
            mockQueue.getFailed.mockResolvedValue([]);

            await cron.getQueueStats();

            expect(mockQueue.getWaiting).toHaveBeenCalled();
            expect(mockQueue.getActive).toHaveBeenCalled();
            expect(mockQueue.getCompleted).toHaveBeenCalled();
            expect(mockQueue.getFailed).toHaveBeenCalled();
        });
    });
});
