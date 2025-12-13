import { Logger } from '@nestjs/common';
import type { Queue } from 'bull';

export abstract class BackgroundJobsService<T> {
    protected readonly logger = new Logger(BackgroundJobsService.name);

    constructor(
        protected readonly queue: Queue,
        protected readonly job_name: string,
        protected readonly priority: number,
        protected readonly delay: number
    ) {}

    async queueJob(
        dto: T,
        priority: number = this.priority,
        delay: number = this.delay,
        error_message_prefix: string
    ) {
        try {
            const job = await this.queue.add(this.job_name, dto, {
                priority,
                delay,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: 10,
                removeOnFail: 5,
            });

            return { success: true, job_id: job.id };
        } catch (error) {
            this.logger.error(error_message_prefix, error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods for queue management
    async getQueueStats() {
        try {
            const waiting = await this.queue.getWaiting();
            const active = await this.queue.getActive();
            const completed = await this.queue.getCompleted();
            const failed = await this.queue.getFailed();

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
            };
        } catch (error) {
            this.logger.error('Failed to get queue stats:', error);
            return null;
        }
    }

    async pauseQueue() {
        try {
            await this.queue.pause();
            this.logger.log('Queue paused');
            return { success: true };
        } catch (error) {
            this.logger.error('Failed to pause queue:', error);
            return { success: false, error: error.message };
        }
    }

    async resumeQueue() {
        try {
            await this.queue.resume();
            this.logger.log('Queue resumed');
            return { success: true };
        } catch (error) {
            this.logger.error('Failed to resume queue:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanQueue() {
        try {
            await this.queue.clean(5000, 'completed');
            await this.queue.clean(5000, 'failed');
            this.logger.log('Queue cleaned');
            return { success: true };
        } catch (error) {
            this.logger.error('Failed to clean queue:', error);
            return { success: false, error: error.message };
        }
    }
}
