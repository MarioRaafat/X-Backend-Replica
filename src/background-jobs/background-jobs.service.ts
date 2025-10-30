import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QUEUE_NAMES, JOB_NAMES, JOB_PRIORITIES, JOB_DELAYS } from './constants/queue.constants';
import type { OtpEmailJobDto } from './dto/email-job.dto';

@Injectable()
export class BackgroundJobsService {
    private readonly logger = new Logger(BackgroundJobsService.name);

    constructor(
        @InjectQueue(QUEUE_NAMES.EMAIL) private email_queue: Queue,
    ) {}

    async queueOtpEmail(
        otp_data: OtpEmailJobDto,
        priority: number = JOB_PRIORITIES.HIGH,
        delay: number = JOB_DELAYS.IMMEDIATE
    ) {
        try {
            const job = await this.email_queue.add(
                JOB_NAMES.EMAIL.SEND_OTP,
                otp_data,
                {
                    priority,
                    delay,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: 10,
                    removeOnFail: 5,
                }
            );

            this.logger.log(`Queued OTP email job with ID: ${job.id} for ${otp_data.email}`);
            return { success: true, job_id: job.id };
        } catch (error) {
            this.logger.error('Failed to queue OTP email job:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods for queue management
    async getEmailQueueStats() {
        try {
            const waiting = await this.email_queue.getWaiting();
            const active = await this.email_queue.getActive();
            const completed = await this.email_queue.getCompleted();
            const failed = await this.email_queue.getFailed();

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
            };
        } catch (error) {
            this.logger.error('Failed to get email queue stats:', error);
            return null;
        }
    }

    async pauseEmailQueue() {
        try {
            await this.email_queue.pause();
            this.logger.log('Email queue paused');
            return { success: true };
        } catch (error) {
            this.logger.error('Failed to pause email queue:', error);
            return { success: false, error: error.message };
        }
    }

    async resumeEmailQueue() {
        try {
            await this.email_queue.resume();
            this.logger.log('Email queue resumed');
            return { success: true };
        } catch (error) {
            this.logger.error('Failed to resume email queue:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanEmailQueue() {
        try {
            await this.email_queue.clean(5000, 'completed');
            await this.email_queue.clean(5000, 'failed');
            this.logger.log('Email queue cleaned');
            return { success: true };
        } catch (error) {
            this.logger.error('Failed to clean email queue:', error);
            return { success: false, error: error.message };
        }
    }
}