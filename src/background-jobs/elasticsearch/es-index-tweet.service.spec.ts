import { Test, TestingModule } from '@nestjs/testing';
import { EsIndexTweetJobService } from './es-index-tweet.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../constants/queue.constants';
import type { Queue } from 'bull';
import { EsSyncTweetDto } from './dtos/es-sync-tweet.dto';

describe('EsIndexTweetJobService', () => {
    let service: EsIndexTweetJobService;
    let queue: jest.Mocked<Queue>;

    const mock_queue = {
        add: jest.fn(),
        getJobCounts: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EsIndexTweetJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.ELASTICSEARCH),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<EsIndexTweetJobService>(EsIndexTweetJobService);
        queue = module.get(getQueueToken(QUEUE_NAMES.ELASTICSEARCH));

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueIndexTweet', () => {
        it('should queue an index tweet job successfully', async () => {
            const dto = { tweet_id: 'tweet-123' };
            const mock_job = { id: 'job-123', data: dto };

            mock_queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueIndexTweet(dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                expect.any(String),
                dto,
                expect.objectContaining({
                    priority: expect.any(Number),
                    delay: expect.any(Number),
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue job with custom priority and delay', async () => {
            const dto = { tweet_id: 'tweet-123' };
            const custom_priority = 5;
            const custom_delay = 1000;
            const mock_job = { id: 'job-123', data: dto };

            mock_queue.add.mockResolvedValue(mock_job as any);

            await service.queueIndexTweet(dto, custom_priority, custom_delay);

            expect(mock_queue.add).toHaveBeenCalledWith(
                expect.any(String),
                dto,
                expect.objectContaining({
                    priority: custom_priority,
                    delay: custom_delay,
                })
            );
        });

        it('should handle queue errors', async () => {
            const dto: EsSyncTweetDto = { tweet_id: 'tweet-123' };
            const error = new Error('Queue error');

            mock_queue.add.mockRejectedValue(error);

            const result = await service.queueIndexTweet(dto);
            expect(result).toEqual({ success: false, error: 'Queue error' });
        });
    });
});
