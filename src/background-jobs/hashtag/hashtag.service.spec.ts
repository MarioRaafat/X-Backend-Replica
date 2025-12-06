import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../constants/queue.constants';
import { HashtagJobDto } from './hashtag-job.dto';
import { HashtagJobService } from './hashtag.service';

describe('HashtagJobService', () => {
    let service: HashtagJobService;
    let mock_hashtag_queue: any;

    beforeEach(async () => {
        mock_hashtag_queue = {
            add: jest.fn(),
            getWaiting: jest.fn(),
            getActive: jest.fn(),
            getCompleted: jest.fn(),
            getFailed: jest.fn(),
            pause: jest.fn(),
            resume: jest.fn(),
            clean: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HashtagJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.HASHTAG),
                    useValue: mock_hashtag_queue,
                },
            ],
        }).compile();

        service = module.get<HashtagJobService>(HashtagJobService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueHashtag', () => {
        it('should queue hashtag with default priority and delay', async () => {
            const hashtag_data: HashtagJobDto = {
                hashtags: {
                    '#trending': { Sports: 10, News: 5 },
                    '#popular': { Entertainment: 8 },
                },
                timestamp: Date.now(),
            };

            mock_hashtag_queue.add.mockResolvedValue({ id: 'job-123' });

            const result = await service.queueHashtag(hashtag_data);

            expect(result).toEqual({ success: true, job_id: 'job-123' });
            expect(mock_hashtag_queue.add).toHaveBeenCalledWith(
                'update-hashtag',
                hashtag_data,
                expect.objectContaining({
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
        });

        it('should queue hashtag with custom priority and delay', async () => {
            const hashtag_data: HashtagJobDto = {
                hashtags: {
                    '#viral': { News: 100 },
                },
                timestamp: Date.now(),
            };

            mock_hashtag_queue.add.mockResolvedValue({ id: 'job-456' });

            const result = await service.queueHashtag(hashtag_data, 8, 5000);

            expect(result).toEqual({ success: true, job_id: 'job-456' });
            expect(mock_hashtag_queue.add).toHaveBeenCalledWith(
                'update-hashtag',
                hashtag_data,
                expect.objectContaining({
                    priority: 8,
                    delay: 5000,
                })
            );
        });

        it('should handle queue errors gracefully', async () => {
            const hashtag_data: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 5 },
                },
                timestamp: Date.now(),
            };

            const error = new Error('Queue is full');
            mock_hashtag_queue.add.mockRejectedValue(error);

            const result = await service.queueHashtag(hashtag_data);

            expect(result).toEqual({ success: false, error: 'Queue is full' });
        });

        it('should handle different hashtag structures', async () => {
            const hashtag_data: HashtagJobDto = {
                hashtags: {
                    '#multiple': { Sports: 50, News: 30, Entertainment: 20 },
                },
                timestamp: Date.now(),
            };

            mock_hashtag_queue.add.mockResolvedValue({ id: 'job-789' });

            const result = await service.queueHashtag(hashtag_data);

            expect(result).toEqual({ success: true, job_id: 'job-789' });
        });
    });

    describe('getHashtagQueueStats', () => {
        it('should return queue statistics', async () => {
            mock_hashtag_queue.getWaiting.mockResolvedValue([1, 2, 3, 4, 5]);
            mock_hashtag_queue.getActive.mockResolvedValue([1, 2]);
            mock_hashtag_queue.getCompleted.mockResolvedValue(new Array(100));
            mock_hashtag_queue.getFailed.mockResolvedValue([1, 2, 3]);

            const result = await service.getHashtagQueueStats();

            expect(result).toEqual({
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3,
            });
        });

        it('should handle empty queues', async () => {
            mock_hashtag_queue.getWaiting.mockResolvedValue([]);
            mock_hashtag_queue.getActive.mockResolvedValue([]);
            mock_hashtag_queue.getCompleted.mockResolvedValue([]);
            mock_hashtag_queue.getFailed.mockResolvedValue([]);

            const result = await service.getHashtagQueueStats();

            expect(result).toEqual({
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
            });
        });

        it('should return null on error', async () => {
            mock_hashtag_queue.getWaiting.mockRejectedValue(new Error('Queue error'));

            const result = await service.getHashtagQueueStats();

            expect(result).toBeNull();
        });
    });

    describe('pauseHashtagQueue', () => {
        it('should pause the hashtag queue successfully', async () => {
            mock_hashtag_queue.pause.mockResolvedValue(undefined);

            const result = await service.pauseHashtagQueue();

            expect(result).toEqual({ success: true });
            expect(mock_hashtag_queue.pause).toHaveBeenCalled();
        });

        it('should handle pause errors', async () => {
            const error = new Error('Cannot pause queue');
            mock_hashtag_queue.pause.mockRejectedValue(error);

            const result = await service.pauseHashtagQueue();

            expect(result).toEqual({ success: false, error: 'Cannot pause queue' });
        });
    });

    describe('resumeHashtagQueue', () => {
        it('should resume the hashtag queue successfully', async () => {
            mock_hashtag_queue.resume.mockResolvedValue(undefined);

            const result = await service.resumeHashtagQueue();

            expect(result).toEqual({ success: true });
            expect(mock_hashtag_queue.resume).toHaveBeenCalled();
        });

        it('should handle resume errors', async () => {
            const error = new Error('Cannot resume queue');
            mock_hashtag_queue.resume.mockRejectedValue(error);

            const result = await service.resumeHashtagQueue();

            expect(result).toEqual({ success: false, error: 'Cannot resume queue' });
        });
    });

    describe('cleanHashtagQueue', () => {
        it('should clean completed and failed jobs', async () => {
            mock_hashtag_queue.clean.mockResolvedValue([]);

            const result = await service.cleanHashtagQueue();

            expect(result).toEqual({ success: true });
            expect(mock_hashtag_queue.clean).toHaveBeenCalledWith(5000, 'completed');
            expect(mock_hashtag_queue.clean).toHaveBeenCalledWith(5000, 'failed');
            expect(mock_hashtag_queue.clean).toHaveBeenCalledTimes(2);
        });

        it('should handle clean errors', async () => {
            const error = new Error('Clean failed');
            mock_hashtag_queue.clean.mockRejectedValue(error);

            const result = await service.cleanHashtagQueue();

            expect(result).toEqual({ success: false, error: 'Clean failed' });
        });
    });
});
