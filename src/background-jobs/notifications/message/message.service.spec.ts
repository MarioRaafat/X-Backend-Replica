import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { MessageJobService } from './message.service';
import {
    JOB_DELAYS,
    JOB_NAMES,
    JOB_PRIORITIES,
    QUEUE_NAMES,
} from '../../constants/queue.constants';
import { MessageBackGroundNotificationJobDTO } from './message.dto';

describe('MessageJobService', () => {
    let service: MessageJobService;
    let mock_queue: any;

    const mock_message_dto: MessageBackGroundNotificationJobDTO = {
        sent_to: 'user-123',
        sent_by: 'user-456',
        message: {} as any,
        message_id: 'message-123',
        chat_id: 'chat-123',
    };

    beforeEach(async () => {
        mock_queue = {
            add: jest.fn().mockResolvedValue({ id: 'job-123' }),
            process: jest.fn(),
            on: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessageJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.NOTIFICATION),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<MessageJobService>(MessageJobService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueMessageNotification', () => {
        it('should queue a message notification job successfully', async () => {
            const result = await service.queueMessageNotification(mock_message_dto);

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MESSAGE,
                mock_message_dto,
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

        it('should queue a message notification job with custom priority', async () => {
            const custom_priority = 1;
            const result = await service.queueMessageNotification(
                mock_message_dto,
                custom_priority
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MESSAGE,
                mock_message_dto,
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

        it('should queue a message notification job with custom delay', async () => {
            const custom_delay = 5000;
            const result = await service.queueMessageNotification(
                mock_message_dto,
                undefined,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MESSAGE,
                mock_message_dto,
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

        it('should queue a message notification job with both custom priority and delay', async () => {
            const custom_priority = 2;
            const custom_delay = 3000;
            const result = await service.queueMessageNotification(
                mock_message_dto,
                custom_priority,
                custom_delay
            );

            expect(mock_queue.add).toHaveBeenCalledWith(
                JOB_NAMES.NOTIFICATION.MESSAGE,
                mock_message_dto,
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

            const result = await service.queueMessageNotification(mock_message_dto);
            expect(result).toEqual({ success: false, error: 'Queue error' });
        });
    });
});
