import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailService } from '../../communication/email.service';
import { JOB_NAMES, QUEUE_NAMES } from '../constants/queue.constants';
import type { OtpEmailJobDto } from '../dto/email-job.dto';
import { generateOtpEmailHtml } from '../../templates/otp-email';
import { reset_password_email_object, verification_email_object } from 'src/constants/variables';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor {
    private readonly logger = new Logger(EmailProcessor.name);

    constructor(private readonly email_service: EmailService) {}

    @Process(JOB_NAMES.EMAIL.SEND_OTP)
    async handleSendOtpEmail(job: Job<OtpEmailJobDto>) {
        try {
            const { email, username, otp, email_type, not_me_link } = job.data;

            let subject: string;
            let title: string;
            let description: string;
            let subtitle: string;
            let subtitle_description: string;

            switch (email_type) {
                case 'verification':
                    ({ subject, title, description, subtitle, subtitle_description } =
                        verification_email_object(otp, not_me_link ?? ''));
                    break;

                case 'reset_password':
                    ({ subject, title, description, subtitle, subtitle_description } =
                        reset_password_email_object(username));
                    break;

                case 'update_email':
                    ({ subject, title, description, subtitle, subtitle_description } =
                        reset_password_email_object(username));
                    break;

                default:
                    throw new Error(`Unknown email type: ${String(email_type)}`);
            }

            const html = generateOtpEmailHtml(
                title,
                description,
                otp,
                subtitle,
                subtitle_description,
                username
            );

            const email_data = {
                recipients: [{ name: username, address: email }],
                subject,
                html,
            };

            const result = await this.email_service.sendEmail(email_data);

            if (result?.success) {
                return { success: true, message: result.message };
            } else {
                this.logger.error(`Failed to send OTP email for job ${job.id} to ${email}`);
                throw new Error('Failed to send OTP email');
            }
        } catch (error) {
            this.logger.error(`Error processing OTP email job ${job.id}:`, error);
            throw error;
        }
    }
}
