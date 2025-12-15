import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ScoredCandidateDTO } from 'src/timeline/dto/scored-candidates.dto';
import { UserTimelineCursor } from 'src/user/entities/user-timeline-cursor.entity';
import { TimelineRedisService } from '../timeline-redis.service';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { RefillTimelineQueueJobService } from 'src/background-jobs/timeline/timeline.service';

@Injectable()
export class ForyouService {
    private readonly refill_batch_size: number;

    constructor(
        @InjectRepository(UserTimelineCursor)
        private readonly timeline_cursor_repository: Repository<UserTimelineCursor>,
        private readonly timeline_redis_service: TimelineRedisService,
        private readonly tweets_repository: TweetsRepository,
        private readonly refill_queue_job_service: RefillTimelineQueueJobService,
        private readonly config_service: ConfigService
    ) {
        this.refill_batch_size = this.config_service.get<number>('TIMELINE_REFILL_BATCH_SIZE', 20);
    }

    async getForyouTimeline(
        user_id: string,
        cursor?: string, // Keep for API compatibility but not used
        limit: number = 20
    ): Promise<{
        data: ScoredCandidateDTO[];
        pagination: { next_cursor: string | null; has_more: boolean };
    }> {
        // Get or create cursor for this user
        let timeline_cursor = await this.timeline_cursor_repository.findOne({
            where: { user_id },
        });

        if (!timeline_cursor) {
            timeline_cursor = this.timeline_cursor_repository.create({
                user_id,
                last_fetched_tweet_id: null,
            });
            await this.timeline_cursor_repository.save(timeline_cursor);
        }

        const last_tweet_id = timeline_cursor.last_fetched_tweet_id;
        let start_index = 0;

        // If we have a last fetched tweet, find its position in the queue
        if (last_tweet_id) {
            const queue_size = await this.timeline_redis_service.getQueueSize(user_id);
            const all_tweets = await this.timeline_redis_service.getFromQueue(
                user_id,
                0,
                queue_size
            );

            const last_index = all_tweets.findIndex((t) => t.tweet_id === last_tweet_id);
            if (last_index !== -1) {
                start_index = last_index + 1; // Start from next tweet
            }
        }

        const redis_tweets = await this.timeline_redis_service.getFromQueue(
            user_id,
            start_index,
            limit
        );

        if (redis_tweets.length === 0) {
            // Queue is empty or exhausted
            return {
                data: [],
                pagination: { next_cursor: null, has_more: false },
            };
        }

        const tweet_ids = redis_tweets.map((t) => t.tweet_id);
        const tweets = await this.tweets_repository.getTweetsByIds(tweet_ids, user_id);

        // Filter out tweets from blocked/muted users
        const filtered_tweets = tweets.filter((tweet) => {
            // The query should already handle blocked/muted, but double-check
            return tweet !== null;
        });

        // Convert to ScoredCandidateDTO with default scores
        // TODO: Implement proper scoring algorithm
        const scored_tweets = filtered_tweets.map((tweet) => {
            const scored = plainToInstance(ScoredCandidateDTO, tweet, {
                excludeExtraneousValues: false,
            });

            // Set default scores (can be enhanced later)
            scored.recency_score = 0.5;
            scored.relevance_score = 50;
            scored.engagement_score = (tweet.likes_count || 0) + (tweet.reposts_count || 0) * 3;
            scored.media_boost =
                (tweet.images?.length || 0) > 0 || (tweet.videos?.length || 0) > 0 ? 10 : 0;
            scored.credibility_boost = tweet.user?.verified ? 10 : 0;
            scored.diversity_penalty = 0;
            scored.location_boost = 0;
            scored.virality_score = tweet.views_count || 0;
            scored._final_score =
                scored.engagement_score + scored.media_boost + scored.credibility_boost;

            return scored;
        });

        // Update cursor to last fetched tweet
        if (scored_tweets.length > 0) {
            const last_tweet = scored_tweets[scored_tweets.length - 1];
            timeline_cursor.last_fetched_tweet_id = last_tweet.tweet_id;
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
        const has_more = remaining_size > start_index + scored_tweets.length;

        return {
            data: scored_tweets,
            pagination: {
                next_cursor: has_more ? 'next' : null, // Dummy cursor for compatibility
                has_more,
            },
        };
    }
}
