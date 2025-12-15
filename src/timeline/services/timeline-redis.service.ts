import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

export interface ITimelineTweetData {
    tweet_id: string;
    created_at: string; // ISO timestamp
}

@Injectable()
export class TimelineRedisService {
    constructor(@InjectRedis() private readonly redis_client: Redis) {}

    private getQueueKey(user_id: string): string {
        return `timeline:foryou:${user_id}`;
    }

    /**
     * Add tweets to the user's timeline queue
     * @param user_id User ID
     * @param tweets Array of tweet data to add
     * @returns Number of items added
     */
    async addToQueue(user_id: string, tweets: ITimelineTweetData[]): Promise<number> {
        if (tweets.length === 0) return 0;

        const key = this.getQueueKey(user_id);
        const pipeline = this.redis_client.pipeline();

        tweets.forEach((tweet) => {
            const value = JSON.stringify(tweet);
            pipeline.rpush(key, value);
        });

        const results = await pipeline.exec();
        if (!results) {
            return 0;
        }

        // Return the length after last push
        const last_result = results[results.length - 1];
        const final_count = last_result && !last_result[0] ? (last_result[1] as number) : 0;
        return final_count;
    }

    /**
     * Get tweets from the queue starting from a specific position
     * @param user_id User ID
     * @param start Start index (0-based)
     * @param count Number of tweets to fetch
     * @returns Array of tweet data
     */
    async getFromQueue(
        user_id: string,
        start: number,
        count: number
    ): Promise<ITimelineTweetData[]> {
        const key = this.getQueueKey(user_id);
        const end = start + count - 1;

        const items = await this.redis_client.lrange(key, start, end);

        return items.map((item) => JSON.parse(item) as ITimelineTweetData);
    }

    /**
     * Get the current size of the queue
     * @param user_id User ID
     * @returns Queue size
     */
    async getQueueSize(user_id: string): Promise<number> {
        const key = this.getQueueKey(user_id);
        return this.redis_client.llen(key);
    }

    /**
     * Check if a tweet exists in the queue
     * @param user_id User ID
     * @param tweet_id Tweet ID to check
     * @returns True if tweet exists in queue
     */
    async isTweetInQueue(user_id: string, tweet_id: string): Promise<boolean> {
        const key = this.getQueueKey(user_id);
        const size = await this.redis_client.llen(key);

        // Fetch all items and check (for small queues this is acceptable)
        const items = await this.redis_client.lrange(key, 0, size - 1);

        for (const item of items) {
            const tweet: ITimelineTweetData = JSON.parse(item);
            if (tweet.tweet_id === tweet_id) {
                return true;
            }
        }

        return false;
    }

    /**
     * Remove tweets older than specified timestamp from the queue
     * @param user_id User ID
     * @param before_timestamp ISO timestamp - remove tweets created before this
     * @returns Number of tweets removed
     */
    async removeOldTweets(user_id: string, before_timestamp: string): Promise<number> {
        const key = this.getQueueKey(user_id);
        const size = await this.redis_client.llen(key);

        if (size === 0) return 0;

        const items = await this.redis_client.lrange(key, 0, size - 1);
        const pipeline = this.redis_client.pipeline();

        let removed_count = 0;

        for (const item of items) {
            const tweet: ITimelineTweetData = JSON.parse(item);
            if (tweet.created_at < before_timestamp) {
                pipeline.lrem(key, 1, item);
                removed_count++;
            }
        }

        if (removed_count > 0) {
            await pipeline.exec();
        }

        return removed_count;
    }

    /**
     * Clear the entire queue for a user
     * @param user_id User ID
     */
    async clearQueue(user_id: string): Promise<void> {
        const key = this.getQueueKey(user_id);
        await this.redis_client.del(key);
    }

    /**
     * Initialize queue with tweets (replaces existing queue)
     * @param user_id User ID
     * @param tweets Array of tweet data
     * @returns Queue size after initialization
     */
    async initializeQueue(user_id: string, tweets: ITimelineTweetData[]): Promise<number> {
        await this.clearQueue(user_id);
        return this.addToQueue(user_id, tweets);
    }

    /**
     * Get all tweet IDs in the queue (for checking duplicates)
     * @param user_id User ID
     * @returns Set of tweet IDs
     */
    async getTweetIdsInQueue(user_id: string): Promise<Set<string>> {
        const key = this.getQueueKey(user_id);
        const size = await this.redis_client.llen(key);
        const items = await this.redis_client.lrange(key, 0, size - 1);

        const tweet_ids = new Set<string>();
        for (const item of items) {
            const tweet: ITimelineTweetData = JSON.parse(item);
            tweet_ids.add(tweet.tweet_id);
        }

        return tweet_ids;
    }

    /**
     * Trim the queue to a maximum size by removing oldest entries (first added)
     * @param user_id User ID
     * @param max_size Maximum queue size to maintain
     * @returns Number of items removed
     * @example If queue has 7000 items and max_size is 5000, removes the first 2000 oldest tweets
     */
    async trimQueue(user_id: string, max_size: number): Promise<number> {
        const key = this.getQueueKey(user_id);
        const current_size = await this.redis_client.llen(key);

        if (current_size <= max_size) {
            return 0;
        }

        const to_remove = current_size - max_size;

        // Remove the oldest tweets (indices 0 to to_remove-1)
        // LTRIM keeps items from 'to_remove' to end, effectively removing the first 'to_remove' items
        // Example: size=7000, max=5000 → removes indices 0-1999, keeps indices 2000-6999 (newest 5000)
        await this.redis_client.ltrim(key, to_remove, -1);

        return to_remove;
    }
}
