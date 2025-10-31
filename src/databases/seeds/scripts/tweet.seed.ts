import { Tweet } from 'src/tweets/entities';
import { User } from 'src/user/entities';
import { SeedHelper } from '../utils/seed-helper';
import { BaseSeeder, ISeederContext } from './seeder.interface';

export class TweetSeeder extends BaseSeeder {
    getName(): string {
        return 'TweetSeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        const { data_source, topic_name, data } = context;

        this.log(`Seeding tweets for topic: ${topic_name}`);

        if (!data.tweets || data.tweets.length === 0) {
            this.logWarning('No tweets found, skipping...');
            return;
        }
        const seen_tweet_ids = new Set<string>();
        const unique_tweets: any[] = [];
        const duplicates: string[] = [];

        for (const row of data.tweets) {
            const id = String(row.tweetId || '').trim();
            if (id && seen_tweet_ids.has(id)) {
                duplicates.push(id);
                continue;
            }
            seen_tweet_ids.add(id);
            unique_tweets.push(row);
        }

        if (duplicates.length > 0) {
            this.logWarning(
                `Found ${duplicates.length} duplicate tweetIds — removing duplicates: ${[...new Set(duplicates)].join(', ')}`
            );
        }

        data.tweets = unique_tweets;
        const user_id_map = context.results?.user_id_map as Map<string, string>;
        if (!user_id_map || user_id_map.size === 0) {
            this.logWarning('No user ID map available, skipping tweets...');
            return;
        }

        const tweet_repository = data_source.getRepository(Tweet);

        const tweets = this.transformTweets(data.tweets, user_id_map, topic_name);
        this.log(`Transformed ${tweets.length} tweets`);

        // Insert in batches
        const inserted = await SeedHelper.insertBatch(tweet_repository, tweets);

        const tweet_id_map = new Map<string, string>();
        data.tweets.forEach((raw_tweet, index) => {
            const db_tweet = inserted[index];
            if (raw_tweet.tweetId && db_tweet?.tweet_id) {
                tweet_id_map.set(String(raw_tweet.tweetId), db_tweet.tweet_id);
            }
        });

        // Store results for next seeder
        context.results = {
            ...context.results,
            tweets: inserted,
            tweet_id_map,
        };

        // Store results in context for reply seeder
        if (!context.results) {
            context.results = {};
        }
        context.results.tweets = inserted;

        this.logSuccess(`Seeded ${inserted.length} tweets`);
    }

    /**
     * Transform raw Excel data to Tweet entities
     */
    private transformTweets(
        raw_data: any[],
        author_id_map: Map<string, string>,
        topic_name: string
    ): Tweet[] {
        return raw_data
            .map((row) => {
                // Get the mapped user_id
                const user_id = author_id_map.get(String(row.authorId));

                if (!user_id) {
                    this.logWarning(
                        `No user mapping found for authorId: ${row.authorId}, skipping tweet (type=${typeof row.authorId})`
                    );
                    return null;
                }

                // Parse media
                const media = SeedHelper.parseMedia(row.media);

                // Parse counts
                const like_count = SeedHelper.parseInt(row.likeCount, 0);
                const retweet_count = SeedHelper.parseInt(row.retweetCount, 0);
                const reply_count = SeedHelper.parseInt(row.replyCount, 0);
                const quote_count = SeedHelper.parseInt(row.quoteCount, 0);
                const view_count = SeedHelper.parseInt(row.viewCount, 0);

                // Parse date
                const created_at = SeedHelper.parseDate(row.createdAt) || new Date();

                // Create tweet entity
                const tweet = new Tweet();
                tweet.user_id = user_id;
                tweet.content = row.content || '';
                tweet.images = media.images;
                tweet.videos = media.videos;
                tweet.num_likes = like_count;
                tweet.num_reposts = retweet_count;
                tweet.num_quotes = quote_count;
                tweet.num_replies = reply_count;
                tweet.num_views = view_count;
                tweet.created_at = created_at;
                tweet.updated_at = created_at;

                return tweet;
            })
            .filter((tweet) => tweet !== null);
    }
}
