import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ReplyJobService } from './reply.service';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { ReplyBackGroundNotificationJobDTO } from './reply.dto';

describe('ReplyJobService', () => {
    let service: ReplyJobService;
    let mock_queue: any;

    const mock_reply_dto: ReplyBackGroundNotificationJobDTO = {
        reply_to: 'user-123',
        replied_by: 'user-456',
        tweet: {} as any,
        reply_tweet_id: 'reply-tweet-123',
        original_tweet_id: 'original-tweet-123',
        conversation_id: 'conversation-123',
    };

    beforeEach(async () => {
        mock_queue = {
            add: jest.fn().mockResolvedValue({ id: 'job-123' }),
            process: jest.fn(),
            on: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReplyJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<ReplyJobService>(ReplyJobService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueReplyNotification', () => {
        it('should queue a reply notification job successfully', async () => {
            const result = await service.queueReplyNotification(mock_reply_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.REPLY,
                mock_reply_dto,
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

        it('should queue a reply notification job with custom priority', async () => {
            const custom_priority = 1;
            const result = await service.queueReplyNotification(mock_reply_dto, custom_priority);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.REPLY,
                mock_reply_dto,
                expect.objectContaining({
                    priority: custom_priority,
                    delay: JOB_DELAYS.IMMEDIATE,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue a reply notification job with custom delay', async () => {
            const custom_delay = 5000;
            const result = await service.queueReplyNotification(
                mock_reply_dto,
                undefined,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.REPLY,
                mock_reply_dto,
                expect.objectContaining({
                    priority: JOB_PRIORITIES.HIGH,
                    delay: custom_delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should queue a reply notification job with both custom priority and delay', async () => {
            const custom_priority = 2;
            const custom_delay = 3000;
            const result = await service.queueReplyNotification(
                mock_reply_dto,
                custom_priority,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.REPLY,
                mock_reply_dto,
                expect.objectContaining({
                    priority: custom_priority,
                    delay: custom_delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                })
            );
            expect(result).toEqual({ success: true, job_id: 'job-123' });
        });

        it('should handle queue errors gracefully', async () => {
            const error = new Error('Queue error');
            mock_queue.add.mockRejectedValueOnce(error);

            const result = await service.queueReplyNotification(mock_reply_dto);
            expect(result).toEqual({ success: false, error: 'Queue error' });
        });

        it('should queue reply with complete conversation context', async () => {
            const dto_with_context: ReplyBackGroundNotificationJobDTO = {
                reply_to: 'user-123',
                replied_by: 'user-456',
                tweet: {
                    tweet_id: 'reply-tweet-123',
                    content: 'This is a reply',
                    user: { id: 'user-456', username: 'replier' },
                } as any,
                reply_tweet_id: 'reply-tweet-123',
                original_tweet_id: 'original-tweet-123',
                conversation_id: 'conversation-123',
            };

            const result = await service.queueReplyNotification(dto_with_context);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.REPLY,
                dto_with_context,
                expect.any(Object)
            );
            expect(result.success).toBe(true);
        });

        it('should handle reply to reply (nested conversations)', async () => {
            const nested_reply_dto: ReplyBackGroundNotificationJobDTO = {
                reply_to: 'user-789',
                replied_by: 'user-456',
                tweet: {} as any,
                reply_tweet_id: 'reply-tweet-456',
                original_tweet_id: 'original-tweet-123',
                conversation_id: 'conversation-123',
            };

            await service.queueReplyNotification(nested_reply_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.REPLY,
                nested_reply_dto,
                expect.any(Object)
            );
        });

        it('should handle action parameter for removing replies', async () => {
            const remove_reply_dto = {
                ...mock_reply_dto,
                action: 'remove' as const,
            };

            await service.queueReplyNotification(remove_reply_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.REPLY,
                remove_reply_dto,
                expect.any(Object)
            );
        });
    });
});
