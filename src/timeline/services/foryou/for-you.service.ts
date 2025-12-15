import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UserTimelineCursor } from 'src/user/entities/user-timeline-cursor.entity';
import { TimelineRedisService } from '../timeline-redis.service';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { RefillTimelineQueueJobService } from 'src/background-jobs/timeline/timeline.service';
import { TweetResponseDTO } from 'src/tweets/dto';
import { TimelineCandidatesService } from '../timeline-candidates.service';

@Injectable()
export class ForyouService {
    private readonly refill_batch_size: number;

    constructor(
        @InjectRepository(UserTimelineCursor)
        private readonly timeline_cursor_repository: Repository<UserTimelineCursor>,
        private readonly timeline_redis_service: TimelineRedisService,
        private readonly tweets_repository: TweetsRepository,
        private readonly refill_queue_job_service: RefillTimelineQueueJobService,
        private readonly config_service: ConfigService,
        private readonly timeline_candidates_service: TimelineCandidatesService
    ) {
        this.refill_batch_size = this.config_service.get<number>('TIMELINE_REFILL_BATCH_SIZE', 20);
    }

    async getForyouTimeline(
        user_id: string,
        cursor?: string, // Keep for API compatibility but not used
        limit: number = 20
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: { next_cursor: string | null; has_more: boolean };
    }> {
        let timeline_cursor = await this.timeline_cursor_repository.findOne({
            where: { user_id },
        });

        if (!timeline_cursor) {
            console.log(`[ForYou API] No cursor found, creating new one for user ${user_id}`);
            timeline_cursor = this.timeline_cursor_repository.create({
                user_id,
                last_fetched_tweet_id: null,
                last_fetched_position: 0,
            });
            await this.timeline_cursor_repository.save(timeline_cursor);
        } else {
            // console.log(`[ForYou API] Found cursor for user ${user_id}, last tweet: ${timeline_cursor.last_fetched_tweet_id}`);
        }

        const start_index = timeline_cursor.last_fetched_position || 0;
        // console.log(`[ForYou API] Starting from position ${start_index} in queue`);

        const redis_tweets = await this.timeline_redis_service.getFromQueue(
            user_id,
            start_index,
            limit
        );

        if (redis_tweets.length === 0) {
            console.log(
                `[ForYou API] No tweets found in Redis queue for user ${user_id} - using direct fallback`
            );

            // Fallback: Fetch tweets directly from candidates service
            const candidates = await this.timeline_candidates_service.getCandidates(
                user_id,
                new Set(), // No exclusions for fresh start
                limit
            );

            if (candidates.length === 0) {
                console.log(`[ForYou API] No candidates found either, returning empty`);
                return {
                    data: [],
                    pagination: { next_cursor: null, has_more: false },
                };
            }

            const candidate_tweet_ids = candidates.map((c) => c.tweet_id);
            const fallback_tweets = await this.tweets_repository.getTweetsByIds(
                candidate_tweet_ids,
                user_id
            );
            return {
                data: fallback_tweets,
                pagination: { next_cursor: 'next', has_more: true },
            };
        }

        const tweet_ids = redis_tweets.map((t) => t.tweet_id);
        // console.log(`[ForYou API] Fetching ${tweet_ids.length} tweets from DB, IDs:`, tweet_ids.slice(0, 3));
        const tweets = await this.tweets_repository.getTweetsByIds(tweet_ids, user_id);

        // Filter out tweets from blocked/muted users
        const filtered_tweets = tweets.filter((tweet) => {
            // The query should already handle blocked/muted, but double-check
            return tweet !== null;
        });

        // Update cursor position
        if (redis_tweets.length > 0) {
            const last_redis_tweet = redis_tweets[redis_tweets.length - 1];
            const new_position = start_index + redis_tweets.length;
            const previous_position = timeline_cursor.last_fetched_position;

            timeline_cursor.last_fetched_tweet_id = last_redis_tweet.tweet_id;
            timeline_cursor.last_fetched_position = new_position;
            timeline_cursor.last_updated_at = new Date();
            await this.timeline_cursor_repository.save(timeline_cursor);
        }

        // background job to refill queue
        const refill_count = Math.max(limit, this.refill_batch_size);
        await this.refill_queue_job_service.queueRefillTimelineQueue({
            user_id,
            refill_count,
        });

        // Check if there are more tweets available
        const remaining_size = await this.timeline_redis_service.getQueueSize(user_id);
        const has_more = remaining_size > start_index + redis_tweets.length;
        return {
            data: filtered_tweets,
            pagination: {
                next_cursor: has_more ? 'next' : null, // Dummy cursor for compatibility
                has_more,
            },
        };
    }
}
