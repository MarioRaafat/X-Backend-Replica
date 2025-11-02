import { BaseSeeder, ISeederContext } from './seeder.interface';
import { SeedHelper } from '../utils/seed-helper';
import { TweetLike } from 'src/tweets/entities/tweet-like.entity';

export class TweetLikesSeeder extends BaseSeeder {
    getName(): string {
        return 'TweetLikesSeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        const { data_source, topic_name, data, results } = context;

        this.log(`Seeding tweet likes for topic: ${topic_name}`);

        if (!data.tweets || data.tweets.length === 0) {
            this.logWarning('No tweets found, skipping...');
            return;
        }

        const user_id_map = results?.user_id_map;
        const tweet_id_map = results?.tweet_id_map;

        if (!user_id_map?.size || !tweet_id_map?.size) {
            this.logWarning('No user/tweet ID maps available, skipping likes...');
            return;
        }

        const likes_repo = data_source.getRepository(TweetLike);

        // Get all database user IDs
        const all_user_ids = Array.from(user_id_map.values());
        const total_users = all_user_ids.length;

        this.log(`Total users in database: ${total_users}`);

        // Process tweets in batches to avoid memory issues
        const BATCH_SIZE = 100;
        const like_set = new Set<string>(); // Track all likes globally
        let total_inserted = 0;

        // First pass: Calculate target counts for each tweet
        const tweet_targets = new Map<string, number>();

        for (const raw_tweet of data.tweets) {
            const tweet_id = tweet_id_map.get(String(raw_tweet.tweetId));
            if (!tweet_id) continue;

            let like_count = SeedHelper.parseInt(raw_tweet.likeCount, 0);

            // Apply the rule: if count > total_users, set to half of total_users
            // Also cap at reasonable maximum to prevent memory issues
            const max_likes = Math.min(Math.floor(total_users / 2), 10);

            if (like_count > total_users) {
                like_count = max_likes;
            } else {
                like_count = Math.min(like_count, max_likes);
            }

            tweet_targets.set(tweet_id, like_count);
        }

        // Second pass: Generate likes in batches
        for (let i = 0; i < data.tweets.length; i += BATCH_SIZE) {
            const batch = data.tweets.slice(i, Math.min(i + BATCH_SIZE, data.tweets.length));
            const like_relations: TweetLike[] = [];

            for (const raw_tweet of batch) {
                const tweet_id = tweet_id_map.get(String(raw_tweet.tweetId));
                if (!tweet_id) continue;

                const target_likes = tweet_targets.get(tweet_id);
                if (!target_likes) continue;

                // Generate random users who liked this tweet
                const liking_users = this.getRandomUsers(all_user_ids, target_likes);

                for (const user_id of liking_users) {
                    const key = `${user_id}:${tweet_id}`;
                    if (!like_set.has(key)) {
                        const like = new TweetLike();
                        like.user_id = user_id;
                        like.tweet_id = tweet_id;
                        like_relations.push(like);
                        like_set.add(key);
                    }
                }
            }

            // Insert this batch
            if (like_relations.length > 0) {
                await SeedHelper.insertBatch(likes_repo, like_relations);
                total_inserted += like_relations.length;
                this.log(
                    `Processed tweets ${i + 1}-${Math.min(i + BATCH_SIZE, data.tweets.length)}: inserted ${like_relations.length} likes (total: ${total_inserted})`
                );
            }

            // Clear memory
            like_relations.length = 0;
        }

        this.logSuccess(`Seeded ${total_inserted} tweet likes`);
    }

    /**
     * Get random users using Fisher-Yates shuffle for unbiased selection
     */
    private getRandomUsers(all_user_ids: string[], count: number): string[] {
        if (all_user_ids.length === 0 || count === 0) {
            return [];
        }

        // Don't try to get more users than available
        const actual_count = Math.min(count, all_user_ids.length);

        // Fisher-Yates shuffle (optimized to only shuffle what we need)
        const result: string[] = [];
        const pool = [...all_user_ids];

        for (let i = 0; i < actual_count; i++) {
            const random_index = Math.floor(Math.random() * (pool.length - i)) + i;

            // Swap
            [pool[i], pool[random_index]] = [pool[random_index], pool[i]];
            result.push(pool[i]);
        }

        return result;
    }
}
