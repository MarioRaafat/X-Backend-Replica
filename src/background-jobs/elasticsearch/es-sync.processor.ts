import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import { ElasticsearchSyncTweetDto } from './elasticsearch-sync-tweet.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { TweetSeederService } from 'src/elasticsearch/seeders/tweets-seeder.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Tweet } from 'src/tweets/entities';
import { Repository } from 'typeorm';

@Processor(QUEUE_NAMES.ELASTICSEARCH)
export class EsSyncProcessor {
    private readonly logger = new Logger(EsSyncProcessor.name);

    constructor(
        @InjectRepository(Tweet)
        private tweets_repository: Repository<Tweet>,
        private readonly elasticsearch_service: ElasticsearchService,
        private readonly tweets_seeder_service: TweetSeederService
    ) {}

    @Process(JOB_NAMES.ELASTICSEARCH.INDEX_TWEET)
    async handleIndexTweet(job: Job<ElasticsearchSyncTweetDto>): Promise<void> {
        const { tweet_id } = job.data;

        try {
            const tweet = await this.tweets_repository.findOne({
                where: { tweet_id },
                relations: ['user'],
            });

            if (!tweet) {
                this.logger.warn(`Tweet ${tweet_id} not found, skipping index`);
                return;
            }

            await this.elasticsearch_service.index({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: tweet_id,
                document: this.tweets_seeder_service.transformTweetForES(tweet),
            });

            this.logger.log(`Indexed tweet ${tweet_id} to Elasticsearch`);
        } catch (error) {
            this.logger.error(`Failed to index tweet ${tweet_id}:`, error);
            throw error;
        }
    }
}
