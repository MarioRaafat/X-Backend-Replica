import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import { EsSyncTweetDto } from './dtos/es-sync-tweet.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { TweetSeederService } from 'src/elasticsearch/seeders/tweets-seeder.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Tweet } from 'src/tweets/entities';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities';
import { EsSyncUserDto } from './dtos/es-sync-user.dto';

@Processor(QUEUE_NAMES.ELASTICSEARCH)
export class EsSyncProcessor {
    private readonly logger = new Logger(EsSyncProcessor.name);

    constructor(
        @InjectRepository(Tweet)
        private tweets_repository: Repository<Tweet>,
        @InjectRepository(User)
        private user_repository: Repository<User>,
        private readonly elasticsearch_service: ElasticsearchService,
        private readonly tweets_seeder_service: TweetSeederService
    ) {}

    @Process(JOB_NAMES.ELASTICSEARCH.INDEX_TWEET)
    async handleIndexTweet(job: Job<EsSyncTweetDto>): Promise<void> {
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

    @Process(JOB_NAMES.ELASTICSEARCH.DELETE_TWEET)
    async handleDeleteTweet(job: Job<EsSyncTweetDto>) {
        const { tweet_id } = job.data;

        try {
            await this.elasticsearch_service.delete({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: tweet_id,
            });

            this.logger.log(`Deleted tweet ${tweet_id} from Elasticsearch`);
        } catch (error) {
            if (error.meta?.statusCode === 404) {
                this.logger.warn(`Tweet ${tweet_id} not found in ES, skipping delete`);
            } else {
                this.logger.error(`Failed to delete tweet ${tweet_id}:`, error);
                throw error;
            }
        }
    }

    @Process(JOB_NAMES.ELASTICSEARCH.UPDATE_USER)
    async handleUpdateTweetsAuthorInfo(job: Job<EsSyncUserDto>) {
        const { user_id } = job.data;

        try {
            const user = await this.user_repository.findOne({ where: { id: user_id } });

            if (!user) {
                this.logger.warn(`User ${user_id} not found for author info update`);
                return;
            }

            const result = await this.elasticsearch_service.updateByQuery({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    query: {
                        term: { author_id: user_id },
                    },
                    script: {
                        source: `
                            ctx._source.name = params.name;
                            ctx._source.username = params.username;
                            ctx._source.followers = params.followers;
                            ctx._source.following = params.following;
                            ctx._source.bio = params.bio;
                            ctx._source.avatar_url = params.avatar_url;
                        `,
                        params: {
                            name: user.name,
                            username: user.username,
                            followers: user.followers || 0,
                            following: user.following || 0,
                            bio: user.bio,
                            avatar_url: user.avatar_url,
                        },
                    },
                },
            });

            this.logger.log(`Updated author info for ${result.updated} tweets by user ${user_id}`);
        } catch (error) {
            this.logger.error(`Failed to update author info for ${user_id}:`, error);
            throw error;
        }
    }

    @Process(JOB_NAMES.ELASTICSEARCH.DELETE_USER)
    async handleDeleteAuthor(job: Job<EsSyncUserDto>) {
        const { user_id } = job.data;

        try {
            await this.elasticsearch_service.deleteByQuery({
                index: ELASTICSEARCH_INDICES.TWEETS,
                query: {
                    term: { author_id: user_id },
                },
            });

            this.logger.log(`Delete tweets with author ${user_id}`);
        } catch (error) {
            this.logger.error(`Failed to delete tweets with author ${user_id}:`, error);
            throw error;
        }
    }
}
