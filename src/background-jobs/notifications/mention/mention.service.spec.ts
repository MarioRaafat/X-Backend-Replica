import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { MentionJobService } from './mention.service';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { MentionBackGroundNotificationJobDTO } from './mention.dto';

describe('MentionJobService', () => {
    let service: MentionJobService;
    let mock_queue: any;

    const mock_mention_dto: MentionBackGroundNotificationJobDTO = {
        mentioned_by: 'user-456',
        mentioned_usernames: ['user1', 'user2'],
        tweet: {} as any,
        tweet_type: 'tweet',
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
                MentionJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<MentionJobService>(MentionJobService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueMentionNotification', () => {
        it('should queue a mention notification job successfully', async () => {
            const result = await service.queueMentionNotification(mock_mention_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MENTION,
                mock_mention_dto,
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

        it('should queue a mention notification job with custom priority', async () => {
            const custom_priority = 1;
            const result = await service.queueMentionNotification(
                mock_mention_dto,
                custom_priority
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MENTION,
                mock_mention_dto,
                expect.objectContaining({
                    priority: custom_priority,
                    delay: JOB_DELAYS.IMMEDIATE,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue a mention notification job with custom delay', async () => {
            const custom_delay = 5000;
            const result = await service.queueMentionNotification(
                mock_mention_dto,
                undefined,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MENTION,
                mock_mention_dto,
                expect.objectContaining({
                    priority: JOB_PRIORITIES.HIGH,
                    delay: custom_delay,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should handle queue errors and log them', async () => {
            const error = new Error('Queue error');
            mock_queue.add.mockRejectedValue(error);

            const logger_spy = jest.spyOn(service['logger'], 'error');

            const result = await service.queueMentionNotification(mock_mention_dto);

            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to queue mention notification job:',
                error
            );
            expect(result).toEqual({ success: false, error: error.message });
        });

        it('should queue mention with remove action', async () => {
            const remove_dto: MentionBackGroundNotificationJobDTO = {
                mentioned_by: 'user-456',
                mentioned_usernames: ['user1'],
                tweet_id: 'tweet-123',
                tweet_type: 'tweet',
                action: 'remove',
            };

            const result = await service.queueMentionNotification(remove_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MENTION,
                remove_dto,
                expect.any(Object)
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue mention for quote tweet', async () => {
            const quote_dto: MentionBackGroundNotificationJobDTO = {
                mentioned_by: 'user-456',
                mentioned_usernames: ['user1'],
                tweet: {} as any,
                parent_tweet: {} as any,
                tweet_type: 'quote',
                action: 'add',
            };

            const result = await service.queueMentionNotification(quote_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MENTION,
                quote_dto,
                expect.any(Object)
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue mention for reply tweet', async () => {
            const reply_dto: MentionBackGroundNotificationJobDTO = {
                mentioned_by: 'user-456',
                mentioned_usernames: ['user1'],
                tweet: {} as any,
                parent_tweet: {} as any,
                tweet_type: 'reply',
                action: 'add',
            };

            const result = await service.queueMentionNotification(reply_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MENTION,
                reply_dto,
                expect.any(Object)
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });
    });
});
