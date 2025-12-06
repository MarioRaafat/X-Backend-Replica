import { Test, TestingModule } from '@nestjs/testing';
import { HashtagController } from './hashtag.controller';
import { HashtagJobService } from './hashtag.service';

describe('HashtagController', () => {
    let controller: HashtagController;
    let mock_service: jest.Mocked<HashtagJobService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HashtagController],
            providers: [
                {
                    provide: HashtagJobService,
                    useValue: {
                        getHashtagQueueStats: jest.fn(),
                        pauseHashtagQueue: jest.fn(),
                        resumeHashtagQueue: jest.fn(),
                        cleanHashtagQueue: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<HashtagController>(HashtagController);
        mock_service = module.get(HashtagJobService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getHashtagQueueStats', () => {
        it('should return hashtag queue statistics', async () => {
            const mock_stats = {
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3,
            };

            mock_service.getHashtagQueueStats.mockResolvedValue(mock_stats);

            const result = await controller.getHashtagQueueStats();

            expect(result).toEqual({ data: mock_stats });
            expect(mock_service.getHashtagQueueStats).toHaveBeenCalled();
        });

        it('should handle empty queue stats', async () => {
            const empty_stats = {
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
            };

            mock_service.getHashtagQueueStats.mockResolvedValue(empty_stats);

            const result = await controller.getHashtagQueueStats();

            expect(result).toEqual({ data: empty_stats });
        });

        it('should handle high queue activity', async () => {
            const active_stats = {
                waiting: 100,
                active: 10,
                completed: 500,
                failed: 5,
            };

            mock_service.getHashtagQueueStats.mockResolvedValue(active_stats);

            const result = await controller.getHashtagQueueStats();

            expect(result).toEqual({ data: active_stats });
        });
    });

    describe('pauseHashtagQueue', () => {
        it('should pause hashtag queue successfully', async () => {
            const mock_result = {
                success: true,
                message: 'Hashtag queue paused',
            };

            mock_service.pauseHashtagQueue.mockResolvedValue(mock_result);

            const result = await controller.pauseHashtagQueue();

            expect(result).toEqual(mock_result);
            expect(mock_service.pauseHashtagQueue).toHaveBeenCalled();
        });

        it('should handle pause errors', async () => {
            const mock_result = {
                success: false,
                error: 'Cannot pause queue',
            };

            mock_service.pauseHashtagQueue.mockResolvedValue(mock_result);

            const result = await controller.pauseHashtagQueue();

            expect(result).toEqual(mock_result);
        });
    });

    describe('resumeHashtagQueue', () => {
        it('should resume hashtag queue successfully', async () => {
            const mock_result = {
                success: true,
                message: 'Hashtag queue resumed',
            };

            mock_service.resumeHashtagQueue.mockResolvedValue(mock_result);

            const result = await controller.resumeHashtagQueue();

            expect(result).toEqual(mock_result);
            expect(mock_service.resumeHashtagQueue).toHaveBeenCalled();
        });

        it('should handle resume errors', async () => {
            const mock_result = {
                success: false,
                error: 'Cannot resume queue',
            };

            mock_service.resumeHashtagQueue.mockResolvedValue(mock_result);

            const result = await controller.resumeHashtagQueue();

            expect(result).toEqual(mock_result);
        });
    });

    describe('cleanHashtagQueue', () => {
        it('should clean hashtag queue successfully', async () => {
            const mock_result = {
                success: true,
                message: 'Cleaned 50 jobs',
                cleaned_count: 50,
            };

            mock_service.cleanHashtagQueue.mockResolvedValue(mock_result);

            const result = await controller.cleanHashtagQueue();

            expect(result).toEqual(mock_result);
            expect(mock_service.cleanHashtagQueue).toHaveBeenCalled();
        });

        it('should handle zero cleaned jobs', async () => {
            const mock_result = {
                success: true,
                message: 'No jobs to clean',
                cleaned_count: 0,
            };

            mock_service.cleanHashtagQueue.mockResolvedValue(mock_result);

            const result = await controller.cleanHashtagQueue();

            expect(result).toEqual(mock_result);
        });

        it('should handle clean errors', async () => {
            const mock_result = {
                success: false,
                error: 'Clean failed',
            };

            mock_service.cleanHashtagQueue.mockResolvedValue(mock_result);

            const result = await controller.cleanHashtagQueue();

            expect(result).toEqual(mock_result);
        });
    });
});
