import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Tweet } from 'src/tweets/entities';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { ELASTICSEARCH_INDICES } from '../schemas';

@Injectable()
export class TweetSeederService {
    private readonly logger = new Logger(TweetSeederService.name);
    private readonly BATCH_SIZE = 1000;

    constructor(
        private readonly tweets_repository: TweetsRepository,
        private readonly elasticsearch_service: ElasticsearchService
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

            await this.bulkIndexTweets(tweets);

            indexed += tweets.length;
            offset += this.BATCH_SIZE;

            this.logger.log(`Indexed ${indexed}/${total_tweets} tweets`);
        }

        this.logger.log('Tweet indexing completed');
    }

    private async bulkIndexTweets(tweets: Tweet[]): Promise<void> {
        const operations = tweets.flatMap((tweet) => [
            { index: { _index: ELASTICSEARCH_INDICES.TWEETS, _id: tweet.tweet_id } },
            this.transformTweetForES(tweet),
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

    private transformTweetForES(tweet: Tweet) {
        return {
            content: tweet.content,
            created_at: tweet.created_at,
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
    }
}
