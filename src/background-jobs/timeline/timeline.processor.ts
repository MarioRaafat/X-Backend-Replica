import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from '../constants/queue.constants';
import type {
    ICleanupOldTweetsJobDTO,
    IInitTimelineQueueJobDTO,
    IRefillTimelineQueueJobDTO,
} from './timeline.dto';
import { TimelineRedisService } from 'src/timeline/services/timeline-redis.service';
import { TimelineCandidatesService } from 'src/timeline/services/timeline-candidates.service';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Processor(QUEUE_NAMES.TIMELINE)
export class TimelineProcessor {
    private readonly queue_size: number;
    private readonly max_queue_size: number;
    private readonly tweet_freshness_days: number;

    constructor(
        private readonly timeline_redis_service: TimelineRedisService,
        private readonly timeline_candidates_service: TimelineCandidatesService,
        private readonly config_service: ConfigService,
        @InjectRepository(User)
        private readonly user_repository: Repository<User>
    ) {
        this.queue_size = this.config_service.get<number>('TIMELINE_QUEUE_SIZE', 100);
        this.tweet_freshness_days = this.config_service.get<number>(
            'TIMELINE_TWEET_FRESHNESS_DAYS',
            7
        );
        this.max_queue_size = this.config_service.get<number>('TIMELINE_MAX_QUEUE_SIZE', 200);
    }

    @Process(JOB_NAMES.TIMELINE.INIT_QUEUE)
    async handleInitQueue(job: Job<IInitTimelineQueueJobDTO>) {
        const { user_id } = job.data;

        try {
            console.log(`[Timeline] Initializing queue for user ${user_id}`);

            // Get existing tweet IDs in queue (should be empty for init, but check anyway)
            const existing_tweet_ids =
                await this.timeline_redis_service.getTweetIdsInQueue(user_id);

            // Get candidates
            const candidates = await this.timeline_candidates_service.getCandidates(
                user_id,
                existing_tweet_ids,
                this.queue_size
            );

            if (candidates.length === 0) {
                console.log(`[Timeline] No candidates found for user ${user_id}`);
                return;
            }

            // Initialize queue with candidates
            const tweets = candidates.map((c) => ({
                tweet_id: c.tweet_id,
                created_at: c.created_at.toISOString(),
            }));

            const queue_size = await this.timeline_redis_service.initializeQueue(user_id, tweets);

            console.log(
                `[Timeline] Initialized queue for user ${user_id} with ${queue_size} tweets`
            );
        } catch (error) {
            console.error(`[Timeline] Error initializing queue for user ${user_id}:`, error);
            throw error;
        }
    }

    @Process(JOB_NAMES.TIMELINE.REFILL_QUEUE)
    async handleRefillQueue(job: Job<IRefillTimelineQueueJobDTO>) {
        const { user_id, refill_count } = job.data;

        try {
            console.log(
                `[Timeline] Refilling queue for user ${user_id} with ${refill_count} tweets`
            );

            // Get existing tweet IDs in queue to avoid duplicates
            const existing_tweet_ids =
                await this.timeline_redis_service.getTweetIdsInQueue(user_id);

            // Get new candidates
            const candidates = await this.timeline_candidates_service.getCandidates(
                user_id,
                existing_tweet_ids,
                refill_count
            );

            if (candidates.length === 0) {
                console.log(`[Timeline] No new candidates found for user ${user_id}`);
                return;
            }

            // Add to queue
            const tweets = candidates.map((c) => ({
                tweet_id: c.tweet_id,
                created_at: c.created_at.toISOString(),
            }));

            const added_count = await this.timeline_redis_service.addToQueue(user_id, tweets);

            console.log(`[Timeline] Added ${added_count} tweets to queue for user ${user_id}`);

            // Trim queue if it exceeds max size
            const current_size = await this.timeline_redis_service.getQueueSize(user_id);
            if (current_size > this.max_queue_size) {
                const removed = await this.timeline_redis_service.trimQueue(
                    user_id,
                    this.max_queue_size
                );
                console.log(
                    `[Timeline] Queue size ${current_size} exceeded max ${this.max_queue_size} for user ${user_id}, trimmed ${removed} tweets`
                );
            }
        } catch (error) {
            console.error(`[Timeline] Error refilling queue for user ${user_id}:`, error);
            throw error;
        }
    }

    @Process(JOB_NAMES.TIMELINE.CLEANUP_OLD_TWEETS)
    async handleCleanupOldTweets(job: Job<ICleanupOldTweetsJobDTO>) {
        const { user_id } = job.data;

        try {
            // Calculate cutoff timestamp
            const cutoff_date = new Date();
            cutoff_date.setDate(cutoff_date.getDate() - this.tweet_freshness_days);
            const cutoff_timestamp = cutoff_date.toISOString();

            if (user_id) {
                // Cleanup for specific user
                console.log(`[Timeline] Cleaning up old tweets for user ${user_id}`);
                const removed = await this.timeline_redis_service.removeOldTweets(
                    user_id,
                    cutoff_timestamp
                );
                console.log(`[Timeline] Removed ${removed} old tweets for user ${user_id}`);
            } else {
                // Cleanup for all users
                console.log(`[Timeline] Cleaning up old tweets for all users`);

                // Get all users (you might want to paginate this for large databases)
                const users = await this.user_repository.find({
                    select: ['id'],
                    where: { deleted_at: null as any },
                });

                let total_removed = 0;
                for (const user of users) {
                    const removed = await this.timeline_redis_service.removeOldTweets(
                        user.id,
                        cutoff_timestamp
                    );
                    total_removed += removed;
                }

                console.log(`[Timeline] Removed ${total_removed} old tweets across all users`);
            }
        } catch (error) {
            console.error('[Timeline] Error cleaning up old tweets:', error);
            throw error;
        }
    }
}
