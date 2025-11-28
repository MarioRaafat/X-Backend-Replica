import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailProcessor } from './email.processor';
import { EmailService } from '../../communication/email.service';
import type { OtpEmailJobDto } from './email-job.dto';

describe('EmailProcessor', () => {
    let processor: EmailProcessor;
    let mock_email_service: jest.Mocked<EmailService>;
    let mock_logger: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailProcessor,
                {
                    provide: EmailService,
                    useValue: {
                        sendEmail: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<EmailProcessor>(EmailProcessor);
        mock_email_service = module.get(EmailService);
        mock_logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        mock_logger.mockRestore();
    });

    describe('handleSendOtpEmail', () => {
        it('should send verification email successfully', async () => {
            const mock_job_data: OtpEmailJobDto = {
                email: 'test@example.com',
                username: 'testuser',
                otp: '123456',
                email_type: 'verification',
                not_me_link: 'https://example.com/not-me',
            };

            const mock_job = {
                id: 'job-123',
                data: mock_job_data,
            } as Job<OtpEmailJobDto>;

            mock_email_service.sendEmail.mockResolvedValue({
                success: true,
                message: 'Email sent successfully',
            });

            const result = await processor.handleSendOtpEmail(mock_job);

            expect(result).toEqual({
                success: true,
                message: 'Email sent successfully',
            });
            expect(mock_email_service.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipients: [{ name: 'testuser', address: 'test@example.com' }],
                    subject: expect.any(String),
                    html: expect.any(String),
                })
            );
        });

        it('should send reset password email successfully', async () => {
            const mock_job_data: OtpEmailJobDto = {
                email: 'test@example.com',
                username: 'testuser',
                otp: '654321',
                email_type: 'reset_password',
            };

            const mock_job = {
                id: 'job-456',
                data: mock_job_data,
            } as Job<OtpEmailJobDto>;

            mock_email_service.sendEmail.mockResolvedValue({
                success: true,
                message: 'Email sent successfully',
            });

            const result = await processor.handleSendOtpEmail(mock_job);

            expect(result).toEqual({
                success: true,
                message: 'Email sent successfully',
            });
            expect(mock_email_service.sendEmail).toHaveBeenCalled();
        });

        it('should send update email successfully', async () => {
            const mock_job_data: OtpEmailJobDto = {
                email: 'new@example.com',
                username: 'testuser',
                otp: '789012',
                email_type: 'update_email',
            };

            const mock_job = {
                id: 'job-789',
                data: mock_job_data,
            } as Job<OtpEmailJobDto>;

            mock_email_service.sendEmail.mockResolvedValue({
                success: true,
                message: 'Email sent successfully',
            });

            const result = await processor.handleSendOtpEmail(mock_job);

            expect(result).toEqual({
                success: true,
                message: 'Email sent successfully',
            });
            expect(mock_email_service.sendEmail).toHaveBeenCalled();
        });

        it('should throw error for unknown email type', async () => {
            const mock_job_data: OtpEmailJobDto = {
                email: 'test@example.com',
                username: 'testuser',
                otp: '123456',
                email_type: 'unknown_type' as any,
            };

            const mock_job = {
                id: 'job-error',
                data: mock_job_data,
            } as Job<OtpEmailJobDto>;

            await expect(processor.handleSendOtpEmail(mock_job)).rejects.toThrow(
                'Unknown email type'
            );
        });

        it('should throw error when email service fails', async () => {
            const mock_job_data: OtpEmailJobDto = {
                email: 'test@example.com',
                username: 'testuser',
                otp: '123456',
                email_type: 'verification',
            };

            const mock_job = {
                id: 'job-fail',
                data: mock_job_data,
            } as Job<OtpEmailJobDto>;

            mock_email_service.sendEmail.mockResolvedValue({
                success: false,
                message: 'Failed to send',
            });

            await expect(processor.handleSendOtpEmail(mock_job)).rejects.toThrow(
                'Failed to send OTP email'
            );
            expect(mock_logger).toHaveBeenCalled();
        });

        it('should handle email service throwing error', async () => {
            const mock_job_data: OtpEmailJobDto = {
                email: 'test@example.com',
                username: 'testuser',
                otp: '123456',
                email_type: 'verification',
            };

            const mock_job = {
                id: 'job-exception',
                data: mock_job_data,
            } as Job<OtpEmailJobDto>;

            const error = new Error('Service error');
            mock_email_service.sendEmail.mockRejectedValue(error);

            await expect(processor.handleSendOtpEmail(mock_job)).rejects.toThrow('Service error');
            expect(mock_logger).toHaveBeenCalledWith(
                expect.stringContaining('Error processing OTP email job'),
                error
            );
        });
    });
});
