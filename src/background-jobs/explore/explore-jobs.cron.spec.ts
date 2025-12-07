import { Test, TestingModule } from '@nestjs/testing';
import { ExploreJobsCron } from './explore-jobs.cron';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../constants/queue.constants';

describe('ExploreJobsCron', () => {
    let cron: ExploreJobsCron;
    let explore_queue: any;

    const mock_queue = {
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
                { provide: getQueueToken(QUEUE_NAMES.EXPLORE), useValue: mock_queue },
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
            const mock_job = { id: '1' };
            mock_queue.add.mockResolvedValue(mock_job);

            await cron.scheduleExploreScoreUpdate();

            expect(mock_queue.add).toHaveBeenCalledWith(
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
            mock_queue.add.mockRejectedValue(new Error('Queue is full'));

            await expect(cron.scheduleExploreScoreUpdate()).resolves.not.toThrow();
        });

        it('should log job id on successful scheduling', async () => {
            const mock_job = { id: '123' };
            mock_queue.add.mockResolvedValue(mock_job);

            await cron.scheduleExploreScoreUpdate();

            expect(mock_queue.add).toHaveBeenCalled();
        });
    });

    describe('triggerManualUpdate', () => {
        it('should trigger manual update with high priority', async () => {
            const mock_job = { id: '2', data: {} };
            mock_queue.add.mockResolvedValue(mock_job);

            const result = await cron.triggerManualUpdate();

            expect(result.success).toBe(true);
            expect(result.job_id).toBe('2');
            expect(result.params).toBeDefined();
            expect(mock_queue.add).toHaveBeenCalledWith(
                'recalculate-explore-scores',
                expect.any(Object),
                expect.objectContaining({
                    priority: expect.any(Number),
                })
            );
        });

        it('should return error on failure', async () => {
            mock_queue.add.mockRejectedValue(new Error('Failed to add job'));

            const result = await cron.triggerManualUpdate();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to add job');
        });

        it('should include job parameters in response', async () => {
            const mock_job = { id: '3' };
            mock_queue.add.mockResolvedValue(mock_job);

            const result = await cron.triggerManualUpdate();

            expect(result.params).toHaveProperty('since_hours');
            expect(result.params).toHaveProperty('max_age_hours');
            expect(result.params).toHaveProperty('batch_size');
            expect(result.params).toHaveProperty('force_all');
        });
    });

    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            const mock_waiting = [{ id: '1' }, { id: '2' }];
            const mock_active = [{ id: '3' }];
            const mock_completed = [{ id: '4' }, { id: '5' }, { id: '6' }];
            const mock_failed = [{ id: '7' }];

            mock_queue.getWaiting.mockResolvedValue(mock_waiting);
            mock_queue.getActive.mockResolvedValue(mock_active);
            mock_queue.getCompleted.mockResolvedValue(mock_completed);
            mock_queue.getFailed.mockResolvedValue(mock_failed);

            const stats = await cron.getQueueStats();

            expect(stats.waiting).toBe(2);
            expect(stats.active).toBe(1);
            expect(stats.completed).toBe(3);
            expect(stats.failed).toBe(1);
            expect(stats.total_jobs).toBe(7);
        });

        it('should handle empty queue', async () => {
            mock_queue.getWaiting.mockResolvedValue([]);
            mock_queue.getActive.mockResolvedValue([]);
            mock_queue.getCompleted.mockResolvedValue([]);
            mock_queue.getFailed.mockResolvedValue([]);

            const stats = await cron.getQueueStats();

            expect(stats.waiting).toBe(0);
            expect(stats.active).toBe(0);
            expect(stats.completed).toBe(0);
            expect(stats.failed).toBe(0);
            expect(stats.total_jobs).toBe(0);
        });

        it('should throw error when queue operation fails', async () => {
            mock_queue.getWaiting.mockRejectedValue(new Error('Redis connection failed'));

            await expect(cron.getQueueStats()).rejects.toThrow('Redis connection failed');
        });

        it('should call all queue methods', async () => {
            mock_queue.getWaiting.mockResolvedValue([]);
            mock_queue.getActive.mockResolvedValue([]);
            mock_queue.getCompleted.mockResolvedValue([]);
            mock_queue.getFailed.mockResolvedValue([]);

            await cron.getQueueStats();

            expect(mock_queue.getWaiting).toHaveBeenCalled();
            expect(mock_queue.getActive).toHaveBeenCalled();
            expect(mock_queue.getCompleted).toHaveBeenCalled();
            expect(mock_queue.getFailed).toHaveBeenCalled();
        });
    });
});
