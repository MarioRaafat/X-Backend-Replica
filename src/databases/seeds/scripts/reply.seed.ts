import { BaseSeeder, ISeederContext } from './seeder.interface';
import { SeedHelper } from '../utils/seed-helper';
import { Tweet } from 'src/tweets/entities/tweet.entity';
import { TweetReply } from 'src/tweets/entities/tweet-reply.entity';

export class ReplySeeder extends BaseSeeder {
    getName(): string {
        return 'ReplySeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        const { data_source, topic_name, data, results } = context;
        this.log(`Seeding replies for topic: ${topic_name}`);

        if (!data.replies?.length) {
            this.logWarning('No replies found, skipping...');
            return;
        }

        const seen_ids = new Set<string>();
        const unique_replies: any[] = [];
        const duplicate_ids: string[] = [];

        for (const row of data.replies) {
            const tweet_id = String(row.tweetId || '').trim();
            if (tweet_id && seen_ids.has(tweet_id)) {
                duplicate_ids.push(tweet_id);
                continue;
            }
            seen_ids.add(tweet_id);
            unique_replies.push(row);
        }

        if (duplicate_ids.length > 0) {
            this.logWarning(
                `Found ${duplicate_ids.length} duplicate reply tweet_ids — removing duplicates: ${[...new Set(duplicate_ids)].join(', ')}`
            );
        }

        data.replies = unique_replies;
        const user_id_map = results?.user_id_map;
        const tweet_id_map = results?.tweet_id_map;

        if (!user_id_map?.size || !tweet_id_map?.size) {
            this.logWarning('Missing user/tweet ID maps, skipping replies...');
            return;
        }

        const tweet_repo = data_source.getRepository(Tweet);
        const reply_repo = data_source.getRepository(TweetReply);

        // Transform replies into Tweet entities
        const reply_tweets_with_ids = this.transformReplies(data.replies, user_id_map);
        const reply_tweets = reply_tweets_with_ids.map((r) => r.tweet);
        const inserted_replies = await SeedHelper.insertBatch(tweet_repo, reply_tweets);
        this.logSuccess(`Inserted ${inserted_replies.length} reply tweets`);

        // Build reply_id_map
        const reply_id_map = new Map<string, string>();

        for (let i = 0; i < reply_tweets_with_ids.length; i++) {
            const raw_tweet_id = reply_tweets_with_ids[i].raw_tweet_id;
            const db_reply = inserted_replies[i];

            if (!raw_tweet_id) continue;

            if (!db_reply?.tweet_id) {
                this.logWarning(
                    `⚠️ Failed to insert reply tweetId=${raw_tweet_id}, skipping mapping.`
                );
                continue;
            }

            reply_id_map.set(raw_tweet_id, db_reply.tweet_id);
        }

        // Build and insert TweetReply relations
        const reply_relations: TweetReply[] = [];

        for (const reply of data.replies) {
            const user_id = user_id_map.get(String(reply.authorId));
            const reply_tweet_id = reply_id_map.get(String(reply.tweetId));
            const original_tweet_id = tweet_id_map.get(String(reply.referenced_tweetId));

            if (!user_id || !reply_tweet_id || !original_tweet_id) {
                this.logWarning(
                    `Skipping invalid reply link: tweetId=${reply.tweetId} (user_id=${user_id}, reply_tweet_id=${reply_tweet_id}, original_tweet_id=${original_tweet_id})`
                );
                continue;
            }

            const relation = new TweetReply();
            relation.user_id = user_id;
            relation.reply_tweet_id = reply_tweet_id;
            relation.original_tweet_id = original_tweet_id;
            reply_relations.push(relation);
        }

        const valid_relations = reply_relations.filter(
            (r) => r.original_tweet_id && r.reply_tweet_id
        );

        await SeedHelper.insertBatch(reply_repo, valid_relations);
        this.logSuccess(`Linked ${valid_relations.length} replies`);
    }

    private transformReplies(
        raw_data: any[],
        user_id_map: Map<string, string>
    ): { tweet: Tweet; raw_tweet_id: string }[] {
        return raw_data
            .map((row) => {
                const user_id = user_id_map.get(String(row.authorId));

                if (!user_id) {
                    this.logWarning(
                        `No user mapping found for authorId: ${row.authorId}, skipping tweet (type=${typeof row.authorId})`
                    );
                    return null;
                }

                const media = SeedHelper.parseMedia(row.media);
                const like_count = SeedHelper.parseInt(row.likeCount, 0);
                const retweet_count = SeedHelper.parseInt(row.retweetCount, 0);
                const reply_count = SeedHelper.parseInt(row.replyCount, 0);
                const quote_count = SeedHelper.parseInt(row.quoteCount, 0);
                const view_count = SeedHelper.parseInt(row.viewCount, 0);
                const created_at = SeedHelper.parseDate(row.createdAt) || new Date();

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

                return { tweet, raw_tweet_id: String(row.tweetId) };
            })
            .filter(Boolean) as { tweet: Tweet; raw_tweet_id: string }[];
    }
}
