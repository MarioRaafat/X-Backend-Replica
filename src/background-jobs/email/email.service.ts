import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { BackgroundJobsService } from '../background-jobs';
import { OtpEmailJobDto } from './email-job.dto';
import { JOB_DELAYS, JOB_NAMES, JOB_PRIORITIES, QUEUE_NAMES } from '../constants/queue.constants';

@Injectable()
export class EmailJobsService extends BackgroundJobsService<OtpEmailJobDto> {
    constructor(@InjectQueue(QUEUE_NAMES.EMAIL) queue: Queue) {
        super(queue, JOB_NAMES.EMAIL.SEND_OTP, JOB_PRIORITIES.HIGH, JOB_DELAYS.IMMEDIATE);
    }

    async queueOtpEmail(dto: OtpEmailJobDto, priority?: number, delay?: number) {
        return await this.queueJob(
            dto,
            priority ?? this.priority,
            delay ?? this.delay,
            'Failed to queue OTP email job:'
        );
    }

    async getEmailQueueStats() {
        return await this.getQueueStats();
    }

    async pauseEmailQueue() {
        return await this.pauseQueue();
    }

    async resumeEmailQueue() {
        return await this.resumeQueue();
    }

    async cleanEmailQueue() {
        return await this.cleanQueue();
    }
}
