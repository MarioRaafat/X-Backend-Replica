import { Test, TestingModule } from '@nestjs/testing';
import { BackgroundJobsService } from './background-jobs.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from './constants/queue.constants';
import { OtpEmailJobDto } from './dto/email-job.dto';

describe('BackgroundJobsService', () => {
    let service: BackgroundJobsService;
    let mock_email_queue: any;

    beforeEach(async () => {
        mock_email_queue = {
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
                BackgroundJobsService,
                {
                    provide: getQueueToken(QUEUE_NAMES.EMAIL),
                    useValue: mock_email_queue,
                },
            ],
        }).compile();

        service = module.get<BackgroundJobsService>(BackgroundJobsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueOtpEmail', () => {
        it('should queue OTP email with default priority and delay', async () => {
            const otp_data: OtpEmailJobDto = {
                email: 'test@example.com',
                username: 'testuser',
                otp: '12345678',
                email_type: 'verification',
            };

            mock_email_queue.add.mockResolvedValue({ id: 'job-123' });

            const result = await service.queueOtpEmail(otp_data);

            expect(result).toEqual({ success: true, job_id: 'job-123' });
            expect(mock_email_queue.add).toHaveBeenCalledWith(
                'send-otp-email',
                otp_data,
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

        it('should queue OTP email with custom priority and delay', async () => {
            const otp_data: OtpEmailJobDto = {
                email: 'user@example.com',
                username: 'anotheruser',
                otp: '87654321',
                email_type: 'reset_password',
            };

            mock_email_queue.add.mockResolvedValue({ id: 'job-456' });

            const result = await service.queueOtpEmail(otp_data, 5, 1000);

            expect(result).toEqual({ success: true, job_id: 'job-456' });
            expect(mock_email_queue.add).toHaveBeenCalledWith(
                'send-otp-email',
                otp_data,
                expect.objectContaining({
                    priority: 5,
                    delay: 1000,
                })
            );
        });

        it('should handle queue errors gracefully', async () => {
            const otp_data: OtpEmailJobDto = {
                email: 'error@example.com',
                username: 'erroruser',
                otp: '00000000',
                email_type: 'verification',
            };

            const error = new Error('Queue is full');
            mock_email_queue.add.mockRejectedValue(error);

            const result = await service.queueOtpEmail(otp_data);

            expect(result).toEqual({ success: false, error: 'Queue is full' });
        });

        it('should queue update_email type', async () => {
            const otp_data: OtpEmailJobDto = {
                email: 'newemail@example.com',
                username: 'updateuser',
                otp: '11223344',
                email_type: 'update_email',
                not_me_link: 'https://example.com/not-me',
            };

            mock_email_queue.add.mockResolvedValue({ id: 'job-789' });

            const result = await service.queueOtpEmail(otp_data);

            expect(result).toEqual({ success: true, job_id: 'job-789' });
        });
    });

    describe('getEmailQueueStats', () => {
        it('should return queue statistics', async () => {
            mock_email_queue.getWaiting.mockResolvedValue([1, 2, 3, 4, 5]);
            mock_email_queue.getActive.mockResolvedValue([1, 2]);
            mock_email_queue.getCompleted.mockResolvedValue(new Array(100));
            mock_email_queue.getFailed.mockResolvedValue([1, 2, 3]);

            const result = await service.getEmailQueueStats();

            expect(result).toEqual({
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3,
            });
        });

        it('should handle empty queues', async () => {
            mock_email_queue.getWaiting.mockResolvedValue([]);
            mock_email_queue.getActive.mockResolvedValue([]);
            mock_email_queue.getCompleted.mockResolvedValue([]);
            mock_email_queue.getFailed.mockResolvedValue([]);

            const result = await service.getEmailQueueStats();

            expect(result).toEqual({
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
            });
        });

        it('should return null on error', async () => {
            mock_email_queue.getWaiting.mockRejectedValue(new Error('Queue error'));

            const result = await service.getEmailQueueStats();

            expect(result).toBeNull();
        });
    });

    describe('pauseEmailQueue', () => {
        it('should pause the email queue successfully', async () => {
            mock_email_queue.pause.mockResolvedValue(undefined);

            const result = await service.pauseEmailQueue();

            expect(result).toEqual({ success: true });
            expect(mock_email_queue.pause).toHaveBeenCalled();
        });

        it('should handle pause errors', async () => {
            const error = new Error('Cannot pause queue');
            mock_email_queue.pause.mockRejectedValue(error);

            const result = await service.pauseEmailQueue();

            expect(result).toEqual({ success: false, error: 'Cannot pause queue' });
        });
    });

    describe('resumeEmailQueue', () => {
        it('should resume the email queue successfully', async () => {
            mock_email_queue.resume.mockResolvedValue(undefined);

            const result = await service.resumeEmailQueue();

            expect(result).toEqual({ success: true });
            expect(mock_email_queue.resume).toHaveBeenCalled();
        });

        it('should handle resume errors', async () => {
            const error = new Error('Cannot resume queue');
            mock_email_queue.resume.mockRejectedValue(error);

            const result = await service.resumeEmailQueue();

            expect(result).toEqual({ success: false, error: 'Cannot resume queue' });
        });
    });

    describe('cleanEmailQueue', () => {
        it('should clean completed and failed jobs', async () => {
            mock_email_queue.clean.mockResolvedValue([]);

            const result = await service.cleanEmailQueue();

            expect(result).toEqual({ success: true });
            expect(mock_email_queue.clean).toHaveBeenCalledWith(5000, 'completed');
            expect(mock_email_queue.clean).toHaveBeenCalledWith(5000, 'failed');
            expect(mock_email_queue.clean).toHaveBeenCalledTimes(2);
        });

        it('should handle clean errors', async () => {
            const error = new Error('Clean failed');
            mock_email_queue.clean.mockRejectedValue(error);

            const result = await service.cleanEmailQueue();

            expect(result).toEqual({ success: false, error: 'Clean failed' });
        });
    });
});
