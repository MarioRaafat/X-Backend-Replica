import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Tweet } from 'src/tweets/entities';
import { ELASTICSEARCH_INDICES } from '../schemas';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TweetType } from 'src/shared/enums/tweet-types.enum';

@Injectable()
export class TweetSeederService {
    private readonly logger = new Logger(TweetSeederService.name);
    private readonly BATCH_SIZE = 1000;

    constructor(
        @InjectRepository(Tweet)
        private tweets_repository: Repository<Tweet>,
        private readonly elasticsearch_service: ElasticsearchService,
        private readonly data_source: DataSource
    ) {}

    async seedTweets(): Promise<void> {
        this.logger.log('Starting tweet indexing...');

        const total_tweets = await this.tweets_repository.count();
        this.logger.log(`Total tweets to index: ${total_tweets}`);

        let offset = 0;
        let indexed = 0;

        while (offset < total_tweets) {
            const tweets = await this.tweets_repository.find({
                skip: offset,
                take: this.BATCH_SIZE,
                relations: ['user'],
            });

            if (tweets.length === 0) break;

            const tweet_ids = tweets.map((t) => t.tweet_id);

            const quotes = await this.data_source.query(
                `SELECT quote_tweet_id, original_tweet_id 
             FROM tweet_quotes 
             WHERE quote_tweet_id = ANY($1)`,
                [tweet_ids]
            );

            const replies = await this.data_source.query(
                `SELECT reply_tweet_id, original_tweet_id, conversation_id 
             FROM tweet_replies 
             WHERE reply_tweet_id = ANY($1)`,
                [tweet_ids]
            );

            const quotes_map = new Map(quotes.map((q) => [q.quote_tweet_id, q.original_tweet_id]));

            const replies_map = new Map(
                replies.map((r) => [
                    r.reply_tweet_id,
                    {
                        parent_id: r.original_tweet_id,
                        conversation_id: r.conversation_id,
                    },
                ])
            );

            await this.bulkIndexTweets(tweets, quotes_map, replies_map);

            indexed += tweets.length;
            offset += this.BATCH_SIZE;

            this.logger.log(`Indexed ${indexed}/${total_tweets} tweets`);
        }

        this.logger.log('Tweet indexing completed');
    }

    private async bulkIndexTweets(
        tweets: Tweet[],
        quotes_map: any,
        replies_map: any
    ): Promise<void> {
        const operations = tweets.flatMap((tweet) => [
            { index: { _index: ELASTICSEARCH_INDICES.TWEETS, _id: tweet.tweet_id } },
            this.transformTweetForES(tweet, quotes_map, replies_map),
        ]);

        if (operations.length === 0) return;

        try {
            const result = await this.elasticsearch_service.bulk({
                refresh: false,
                operations,
            });

            if (result.errors) {
                this.logger.error('Bulk indexing had errors', result.items);
            }
        } catch (error) {
            this.logger.error('Failed to bulk index tweets', error);
            throw error;
        }
    }

    private transformTweetForES(tweet: Tweet, quotes_map: any, replies_map: any) {
        const base_transform = {
            tweet_id: tweet.tweet_id,
            content: tweet.content,
            created_at: tweet.created_at,
            updated_at: tweet.updated_at,
            type: tweet.type,
            num_likes: tweet.num_likes || 0,
            num_reposts: tweet.num_reposts || 0,
            num_views: tweet.num_views || 0,
            num_replies: tweet.num_replies || 0,
            num_quotes: tweet.num_quotes || 0,
            author_id: tweet.user_id,
            name: tweet.user?.name,
            username: tweet.user?.username,
            followers: tweet.user?.followers || 0,
            following: tweet.user?.following || 0,
            images: tweet.images || [],
            videos: tweet.videos || [],
            bio: tweet.user?.bio,
            avatar_url: tweet.user?.avatar_url,
        };

        if (tweet.type === TweetType.QUOTE && quotes_map.has(tweet.tweet_id)) {
            base_transform['parent_id'] = quotes_map.get(tweet.tweet_id);
        }

        if (tweet.type === TweetType.REPLY && replies_map.has(tweet.tweet_id)) {
            const reply_data = replies_map.get(tweet.tweet_id);
            base_transform['parent_id'] = reply_data.parent_id;
            base_transform['conversation_id'] = reply_data.conversation_id;
        }

        return base_transform;
    }
}
