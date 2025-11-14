import { BaseSeeder, ISeederContext } from './seeder.interface';
import { SeedHelper } from '../utils/seed-helper';
import { TweetRepost } from 'src/tweets/entities/tweet-repost.entity';

export class TweetRepostsSeeder extends BaseSeeder {
    getName(): string {
        return 'TweetRepostsSeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        const { data_source, topic_name, data, results } = context;

        this.log(`Seeding tweet reposts for topic: ${topic_name}`);

        if (!data.tweets || data.tweets.length === 0) {
            this.logWarning('No tweets found, skipping...');
            return;
        }

        const user_id_map = results?.user_id_map;
        const tweet_id_map = results?.tweet_id_map;

        if (!user_id_map?.size || !tweet_id_map?.size) {
            this.logWarning('No user/tweet ID maps available, skipping reposts...');
            return;
        }

        const reposts_repo = data_source.getRepository(TweetRepost);

        // Get all database user IDs
        const all_user_ids = Array.from(user_id_map.values());
        const total_users = all_user_ids.length;

        this.log(`Total users in database: ${total_users}`);

        // Process tweets in batches to avoid memory issues
        const BATCH_SIZE = 100;
        const repost_set = new Set<string>(); // Track all reposts globally
        let total_inserted = 0;

        // First pass: Calculate target counts for each tweet
        const tweet_targets = new Map<string, number>();

        for (const raw_tweet of data.tweets) {
            const tweet_id = tweet_id_map.get(String(raw_tweet.tweetId));
            if (!tweet_id) continue;

            let repost_count = SeedHelper.parseInt(raw_tweet.retweetCount, 0);

            // Apply the rule: if count > total_users, set to half of total_users
            // Also cap at reasonable maximum to prevent memory issues
            const max_reposts = Math.min(Math.floor(total_users / 2), 5);

            if (repost_count > total_users) {
                repost_count = max_reposts;
            } else {
                repost_count = Math.min(repost_count, max_reposts);
            }

            tweet_targets.set(tweet_id, repost_count);
        }

        // Second pass: Generate reposts in batches
        for (let i = 0; i < data.tweets.length; i += BATCH_SIZE) {
            const batch = data.tweets.slice(i, Math.min(i + BATCH_SIZE, data.tweets.length));
            const repost_relations: TweetRepost[] = [];

            for (const raw_tweet of batch) {
                const tweet_id = tweet_id_map.get(String(raw_tweet.tweetId));
                if (!tweet_id) continue;

                const target_reposts = tweet_targets.get(tweet_id);
                if (!target_reposts) continue;

                // Generate random users who reposted this tweet
                const reposting_users = this.getRandomUsers(all_user_ids, target_reposts);

                for (const user_id of reposting_users) {
                    const key = `${user_id}:${tweet_id}`;
                    if (!repost_set.has(key)) {
                        const repost = new TweetRepost();
                        repost.user_id = user_id;
                        repost.tweet_id = tweet_id;
                        repost_relations.push(repost);
                        repost_set.add(key);
                    }
                }
            }

            // Insert this batch
            if (repost_relations.length > 0) {
                await SeedHelper.insertBatch(reposts_repo, repost_relations);
                total_inserted += repost_relations.length;
                this.log(
                    `Processed tweets ${i + 1}-${Math.min(i + BATCH_SIZE, data.tweets.length)}: inserted ${repost_relations.length} reposts (total: ${total_inserted})`
                );
            }

            // Clear memory
            repost_relations.length = 0;
        }

        this.logSuccess(`Seeded ${total_inserted} tweet reposts`);
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
