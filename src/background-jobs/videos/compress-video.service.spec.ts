import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { CompressVideoJobService } from './compress-video.service';
import { QUEUE_NAMES } from '../constants/queue.constants';
import type { Queue } from 'bull';

describe('CompressVideoJobService', () => {
    let service: CompressVideoJobService;
    let mock_queue: jest.Mocked<Queue>;

    beforeEach(async () => {
        mock_queue = {
            add: jest.fn(),
        } as unknown as jest.Mocked<Queue>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CompressVideoJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.VIDEO),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<CompressVideoJobService>(CompressVideoJobService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueCompressVideo', () => {
        const mock_job_data = {
            video_url: 'https://example.blob.core.windows.net/videos/test.mp4',
            video_name: 'test.mp4',
            container_name: 'post-videos',
        };

        it('should successfully queue a video compression job', async () => {
            mock_queue.add.mockResolvedValue({} as any);

            await service.queueCompressVideo(mock_job_data);

            expect(mock_queue.add).toHaveBeenCalledTimes(1);
            expect(mock_queue.add).toHaveBeenCalledWith(
                'compress-video',
                mock_job_data,
                expect.objectContaining({
                    priority: expect.any(Number),
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                })
            );
        });

        it('should throw error when queue add fails', async () => {
            const error = new Error('Queue error');
            mock_queue.add.mockRejectedValue(error);

            await expect(service.queueCompressVideo(mock_job_data)).rejects.toThrow('Queue error');
            expect(mock_queue.add).toHaveBeenCalledTimes(1);
        });

        it('should log successful queue operation', async () => {
            const logger_spy = jest.spyOn(service['logger'], 'log');
            mock_queue.add.mockResolvedValue({} as any);

            await service.queueCompressVideo(mock_job_data);

            expect(logger_spy).toHaveBeenCalledWith(
                `Queued video compression for: ${mock_job_data.video_name}`
            );
        });

        it('should log error when queueing fails', async () => {
            const logger_spy = jest.spyOn(service['logger'], 'error');
            const error = new Error('Queue error');
            mock_queue.add.mockRejectedValue(error);

            await expect(service.queueCompressVideo(mock_job_data)).rejects.toThrow();
            expect(logger_spy).toHaveBeenCalledWith(
                `Failed to queue video compression: Queue error`
            );
        });
    });
});
