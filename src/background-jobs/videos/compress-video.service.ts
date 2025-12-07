import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { JOB_NAMES, JOB_PRIORITIES, QUEUE_NAMES } from '../constants/queue.constants';
import { ICompressVideoJobDto } from './compress-video.dto';

@Injectable()
export class CompressVideoJobService {
    private readonly logger = new Logger(CompressVideoJobService.name);

    constructor(@InjectQueue(QUEUE_NAMES.VIDEO) private readonly video_queue: Queue) {}

    async queueCompressVideo(data: ICompressVideoJobDto): Promise<void> {
        try {
            await this.video_queue.add(JOB_NAMES.VIDEO.COMPRESS, data, {
                priority: JOB_PRIORITIES.MEDIUM,
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            });

            this.logger.log(`Queued video compression for: ${data.video_name}`);
        } catch (error) {
            this.logger.error(`Failed to queue video compression: ${error.message}`);
            throw error;
        }
    }
}
