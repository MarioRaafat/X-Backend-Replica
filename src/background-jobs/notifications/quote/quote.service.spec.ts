import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QuoteJobService } from './quote.service';
import { QuoteBackGroundNotificationJobDTO } from './quote.dto';
import { QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';

describe('QuoteJobService', () => {
    let service: QuoteJobService;
    let queue: jest.Mocked<Queue>;

    beforeEach(async () => {
        const mock_queue = {
            add: jest.fn(),
            getWaiting: jest.fn(),
            getActive: jest.fn(),
            getCompleted: jest.fn(),
            getFailed: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QuoteJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<QuoteJobService>(QuoteJobService);
        queue = module.get(getQueueToken(QUEUE_NAMES.NOTIFICATION));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueQuoteNotification', () => {
        it('should queue quote notification with add action', async () => {
            const dto: QuoteBackGroundNotificationJobDTO = {
                quote_to: 'original-author-123',
                quoted_by: 'quoter-456',
                quote_tweet_id: 'quote-tweet-789',
                quote_tweet: { tweet_id: 'quote-tweet-789' } as any,
                parent_tweet: { tweet_id: 'parent-123' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-123' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueQuoteNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue quote notification with remove action', async () => {
            const dto: QuoteBackGroundNotificationJobDTO = {
                quote_to: 'original-author-456',
                quoted_by: 'quoter-789',
                quote_tweet_id: 'quote-tweet-999',
                action: 'remove',
            };

            const mock_job = { id: 'job-456' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueQuoteNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-456' });
        });

        it('should queue with custom priority and delay', async () => {
            const dto: QuoteBackGroundNotificationJobDTO = {
                quote_to: 'author-custom',
                quoted_by: 'quoter-custom',
                quote_tweet_id: 'quote-custom',
                quote_tweet: { tweet_id: 'quote-custom' } as any,
                parent_tweet: { tweet_id: 'parent-custom' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-custom' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueQuoteNotification(dto, 3, 2000);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-custom' });
        });

        it('should handle queue errors', async () => {
            const dto: QuoteBackGroundNotificationJobDTO = {
                quote_to: 'author-error',
                quoted_by: 'quoter-error',
                quote_tweet_id: 'quote-error',
                action: 'add',
            };

            const error = new Error('Queue error');
            queue.add.mockRejectedValue(error);

            const result = await service.queueQuoteNotification(dto);

            expect(result).toEqual({ success: false, error: 'Queue error' });
        });

        it('should handle quote without parent tweet', async () => {
            const dto: QuoteBackGroundNotificationJobDTO = {
                quote_to: 'author-no-parent',
                quoted_by: 'quoter-no-parent',
                quote_tweet_id: 'quote-no-parent',
                quote_tweet: { tweet_id: 'quote-no-parent' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-no-parent' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueQuoteNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-no-parent' });
        });

        it('should handle self-quoting scenario', async () => {
            const same_user = 'user-self-quote';
            const dto: QuoteBackGroundNotificationJobDTO = {
                quote_to: same_user,
                quoted_by: same_user,
                quote_tweet_id: 'quote-self',
                quote_tweet: { tweet_id: 'quote-self' } as any,
                parent_tweet: { tweet_id: 'parent-self' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-self' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueQuoteNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-self' });
        });

        it('should handle missing quote_tweet in remove action', async () => {
            const dto: QuoteBackGroundNotificationJobDTO = {
                quote_to: 'author-remove',
                quoted_by: 'quoter-remove',
                quote_tweet_id: 'quote-remove',
                action: 'remove',
            };

            const mock_job = { id: 'job-remove' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueQuoteNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-remove' });
        });
    });
});
