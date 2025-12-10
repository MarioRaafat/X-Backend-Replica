import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import type { Queue } from 'bull';
import { RepostJobService } from './repost.service';
import { RepostBackGroundNotificationJobDTO } from './repost.dto';
import { QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';

describe('RepostJobService', () => {
    let service: RepostJobService;
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
                RepostJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<RepostJobService>(RepostJobService);
        queue = module.get(getQueueToken(QUEUE_NAMES.NOTIFICATION));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueRepostNotification', () => {
        it('should queue repost notification with add action', async () => {
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: 'original-author-123',
                reposted_by: 'reposter-456',
                tweet_id: 'tweet-789',
                tweet: { tweet_id: 'tweet-789' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-123' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueRepostNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue repost notification with remove action', async () => {
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: 'original-author-456',
                reposted_by: 'reposter-789',
                tweet_id: 'tweet-999',
                action: 'remove',
            };

            const mock_job = { id: 'job-456' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueRepostNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-456' });
        });

        it('should queue with custom priority and delay', async () => {
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: 'author-custom',
                reposted_by: 'reposter-custom',
                tweet_id: 'tweet-custom',
                tweet: { tweet_id: 'tweet-custom' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-custom' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueRepostNotification(dto, 4, 3000);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-custom' });
        });

        it('should handle queue errors', async () => {
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: 'author-error',
                reposted_by: 'reposter-error',
                tweet_id: 'tweet-error',
                action: 'add',
            };

            const error = new Error('Queue error');
            queue.add.mockRejectedValue(error);

            const result = await service.queueRepostNotification(dto);

            expect(result).toEqual({ success: false, error: 'Queue error' });
        });

        it('should handle self-reposting scenario', async () => {
            const same_user = 'user-self-repost';
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: same_user,
                reposted_by: same_user,
                tweet_id: 'tweet-self',
                tweet: { tweet_id: 'tweet-self' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-self' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueRepostNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-self' });
        });

        it('should handle repost without tweet data in remove action', async () => {
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: 'author-no-tweet',
                reposted_by: 'reposter-no-tweet',
                tweet_id: 'tweet-no-data',
                action: 'remove',
            };

            const mock_job = { id: 'job-no-tweet' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueRepostNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-no-tweet' });
        });

        it('should handle multiple sequential reposts', async () => {
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: 'popular-author',
                reposted_by: 'reposter-seq',
                tweet_id: 'viral-tweet',
                tweet: { tweet_id: 'viral-tweet' } as any,
                action: 'add',
            };

            const mock_job = { id: 'job-seq' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueRepostNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-seq' });
        });

        it('should handle missing repost_to in payload', async () => {
            const dto: RepostBackGroundNotificationJobDTO = {
                repost_to: '',
                reposted_by: 'reposter-missing',
                tweet_id: 'tweet-missing',
                action: 'add',
            };

            const mock_job = { id: 'job-missing' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueRepostNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-missing' });
        });
    });
});
