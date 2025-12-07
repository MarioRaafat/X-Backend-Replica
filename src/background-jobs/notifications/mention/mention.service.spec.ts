import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import type { Queue } from 'bull';
import { MentionJobService } from './mention.service';
import { MentionBackGroundNotificationJobDTO } from './mention.dto';
import { QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';

describe('MentionJobService', () => {
    let service: MentionJobService;
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
                MentionJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<MentionJobService>(MentionJobService);
        queue = module.get(getQueueToken(QUEUE_NAMES.NOTIFICATION));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueMentionNotification', () => {
        it('should queue mention notification with add action', async () => {
            const dto: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['user1', 'user2'],
                mentioned_by: 'author-123',
                tweet_id: 'tweet-456',
                tweet: { tweet_id: 'tweet-456' } as any,
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job = { id: 'job-123' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueMentionNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue mention notification with remove action', async () => {
            const dto: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['user3'],
                mentioned_by: 'author-456',
                tweet_id: 'tweet-789',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const mock_job = { id: 'job-456' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueMentionNotification(dto);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-456' });
        });

        it('should queue with custom priority and delay', async () => {
            const dto: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['user4', 'user5', 'user6'],
                mentioned_by: 'author-789',
                tweet_id: 'tweet-999',
                tweet: { tweet_id: 'tweet-999' } as any,
                tweet_type: 'reply',
                action: 'add',
            };

            const mock_job = { id: 'job-custom' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueMentionNotification(dto, 5, 1000);

            expect(queue.add).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, job_id: 'job-custom' });
        });

        it('should handle queue errors', async () => {
            const dto: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['user7'],
                mentioned_by: 'author-error',
                tweet_id: 'tweet-error',
                tweet_type: 'tweet',
                action: 'add',
            };

            const error = new Error('Queue error');
            queue.add.mockRejectedValue(error);

            const result = await service.queueMentionNotification(dto);

            expect(result).toEqual({ success: false, error: 'Queue error' });
        });

        it('should handle multiple mentioned users', async () => {
            const many_users = Array.from({ length: 20 }, (_, i) => `user${i}`);
            const dto: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: many_users,
                mentioned_by: 'author-many',
                tweet_id: 'tweet-many',
                tweet: { tweet_id: 'tweet-many' } as any,
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job = { id: 'job-many' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueMentionNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-many' });
        });

        it('should handle mention with parent tweet', async () => {
            const dto: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: ['user8'],
                mentioned_by: 'author-reply',
                tweet_id: 'tweet-reply',
                tweet: { tweet_id: 'tweet-reply' } as any,
                parent_tweet: { tweet_id: 'parent-123' } as any,
                tweet_type: 'reply',
                action: 'add',
            };

            const mock_job = { id: 'job-reply' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueMentionNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-reply' });
        });

        it('should handle empty mentioned_usernames array', async () => {
            const dto: MentionBackGroundNotificationJobDTO = {
                mentioned_usernames: [],
                mentioned_by: 'author-empty',
                tweet_id: 'tweet-empty',
                tweet_type: 'tweet',
                action: 'add',
            };

            const mock_job = { id: 'job-empty' };
            queue.add.mockResolvedValue(mock_job as any);

            const result = await service.queueMentionNotification(dto);

            expect(result).toEqual({ success: true, job_id: 'job-empty' });
        });
    });
});
