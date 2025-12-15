import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from 'src/background-jobs/constants/queue.constants';
import { EsSyncTweetDto } from './dtos/es-sync-tweet.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { InjectRepository } from '@nestjs/typeorm';
import { Tweet } from 'src/tweets/entities';
import { Repository } from 'typeorm';
import { User, UserFollows } from 'src/user/entities';
import { EsSyncUserDto } from './dtos/es-sync-user.dto';
import { EsSyncFollowDto } from './dtos/es-sync-follow.dto';
import { TweetType } from 'src/shared/enums/tweet-types.enum';
import { EsDeleteTweetsDto } from './dtos/es-delete-tweets.dto';

@Processor(QUEUE_NAMES.ELASTICSEARCH)
export class EsSyncProcessor {
    private readonly logger = new Logger(EsSyncProcessor.name);

    constructor(
        @InjectRepository(Tweet)
        private readonly tweets_repository: Repository<Tweet>,
        @InjectRepository(User)
        private readonly user_repository: Repository<User>,
        private readonly elasticsearch_service: ElasticsearchService,
        @InjectRepository(UserFollows)
        private readonly user_follows_repository: Repository<UserFollows>
    ) {}

    @Process(JOB_NAMES.ELASTICSEARCH.INDEX_TWEET)
    async handleIndexTweet(job: Job<EsSyncTweetDto>): Promise<void> {
        const { tweet_id, parent_id, conversation_id } = job.data;

        try {
            const tweet = await this.tweets_repository.findOne({
                where: { tweet_id },
                relations: ['user'],
            });

            if (!tweet) {
                this.logger.warn(`Tweet ${tweet_id} not found, skipping index`);
                return;
            }

            let final_parent_id = parent_id;
            let final_conversation_id = conversation_id;

            if ((!parent_id || !conversation_id) && tweet.type !== TweetType.TWEET) {
                try {
                    const existing_doc = await this.elasticsearch_service.get<{
                        parent_id?: string;
                        conversation_id?: string;
                    }>({
                        index: ELASTICSEARCH_INDICES.TWEETS,
                        id: tweet_id,
                    });

                    final_parent_id = parent_id || existing_doc._source?.parent_id;
                    final_conversation_id =
                        conversation_id || existing_doc._source?.conversation_id;
                } catch (error) {
                    this.logger.debug(`No existing ES document for tweet ${tweet_id}`);
                }
            }

            await this.elasticsearch_service.index({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: tweet_id,
                document: this.transformTweetForES(tweet, final_parent_id, final_conversation_id),
            });

            this.logger.log(`Indexed tweet ${tweet_id} to Elasticsearch`);
        } catch (error) {
            this.logger.error(`Failed to index tweet ${tweet_id}:`, error);
            throw error;
        }
    }

    @Process(JOB_NAMES.ELASTICSEARCH.DELETE_TWEET)
    async handleDeleteTweet(job: Job<EsDeleteTweetsDto>) {
        const { tweet_ids } = job.data;

        if (!tweet_ids?.length) {
            this.logger.warn('No tweet_ids provided, skipping ES delete');
            return;
        }

        try {
            const body = tweet_ids.flatMap((tweet_id: string) => [
                { delete: { _index: ELASTICSEARCH_INDICES.TWEETS, _id: tweet_id } },
            ]);

            const response = await this.elasticsearch_service.bulk({ body });

            if (response.errors) {
                response.items.forEach((item, i) => {
                    const result = item.delete;
                    if (result?.error) {
                        if (result.status === 404) {
                            this.logger.warn(`Tweet ${tweet_ids[i]} not found in ES, skipping`);
                        } else {
                            this.logger.error(
                                `Failed to delete tweet ${tweet_ids[i]}:`,
                                result.error
                            );
                        }
                    }
                });
            }

            this.logger.log(`Deleted ${tweet_ids.length} tweets from Elasticsearch`);
        } catch (error) {
            this.logger.error('Bulk delete failed:', error);
            throw error;
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

        let follows: { follower_id: string; followed_id: string }[] = [];
        try {
            follows = await this.user_follows_repository
                .createQueryBuilder('uf')
                .select(['uf.follower_id AS follower_id', 'uf.followed_id AS followed_id'])
                .where('uf.followed_id = :id', { id: user_id })
                .orWhere('uf.follower_id = :id', { id: user_id })
                .getRawMany();
        } catch (error) {
            console.log(error);
        }

        await this.user_repository.delete(user_id);

        const follower_ids = follows
            .filter((r) => r.followed_id === user_id)
            .map((r) => r.follower_id);

        const followed_ids = follows
            .filter((r) => r.follower_id === user_id)
            .map((r) => r.followed_id);

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

        await Promise.all([
            this.decrementFollowCountsForUsers(follower_ids, 'following'),
            this.decrementFollowCountsForUsers(followed_ids, 'followers'),
        ]);
    }

    @Process(JOB_NAMES.ELASTICSEARCH.FOLLOW)
    async handleFollow(job: Job<EsSyncFollowDto>) {
        const { follower_id, followed_id } = job.data;

        try {
            const [follower, followed] = await Promise.all([
                this.user_repository.findOne({ where: { id: follower_id } }),
                this.user_repository.findOne({ where: { id: followed_id } }),
            ]);

            if (!follower) {
                this.logger.warn(`User ${follower_id} not found for author info update`);
                return;
            }
            if (!followed) {
                this.logger.warn(`User ${followed_id} not found for author info update`);
                return;
            }

            await Promise.all([
                this.elasticsearch_service.updateByQuery({
                    index: ELASTICSEARCH_INDICES.TWEETS,
                    body: {
                        query: {
                            term: { author_id: follower_id },
                        },
                        script: {
                            source: `
                            ctx._source.following = params.following;
                        `,
                            params: {
                                following: follower.following || 0,
                            },
                        },
                    },
                }),
                this.elasticsearch_service.updateByQuery({
                    index: ELASTICSEARCH_INDICES.TWEETS,
                    body: {
                        query: {
                            term: { author_id: followed_id },
                        },
                        script: {
                            source: `
                            ctx._source.followers = params.followers;
                        `,
                            params: {
                                followers: followed.followers || 0,
                            },
                        },
                    },
                }),
            ]);

            this.logger.log(
                `Updated follow info for tweets by users ${follower_id} and ${followed_id}`
            );
        } catch (error) {
            this.logger.error(
                `Failed to update follow info for tweets by users ${follower_id} and ${followed_id}:`,
                error
            );
            throw error;
        }
    }

    private transformTweetForES(
        tweet: Tweet,
        parent_id: string | undefined,
        conversation_id: string | undefined
    ) {
        const base_transform = {
            tweet_id: tweet.tweet_id,
            content: tweet.content,
            hashtags: this.extractHashtags(tweet.content),
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

        if (parent_id) {
            base_transform['parent_id'] = parent_id;
        }

        if (conversation_id) {
            base_transform['conversation_id'] = conversation_id;
        }

        return base_transform;
    }

    private async decrementFollowCountsForUsers(
        user_ids: string[],
        field: 'followers' | 'following'
    ) {
        if (user_ids.length === 0) return;

        const BATCH_SIZE = 1000;

        for (let i = 0; i < user_ids.length; i += BATCH_SIZE) {
            const batch = user_ids.slice(i, i + BATCH_SIZE);

            try {
                const result = await this.elasticsearch_service.updateByQuery({
                    index: ELASTICSEARCH_INDICES.TWEETS,
                    body: {
                        query: {
                            terms: { author_id: batch },
                        },
                        script: {
                            source: `
                                if (ctx._source.${field} > 0) {
                                    ctx._source.${field} -= 1;
                                }
                            `,
                        },
                    },
                    conflicts: 'proceed',
                    refresh: false,
                });

                this.logger.log(`Decremented ${field} in ${result.updated} tweets`);
            } catch (error) {
                this.logger.error(
                    `Failed to decrement ${field} for batch starting at ${i}:`,
                    error
                );
            }
        }
    }

    private extractHashtags(content: string): string[] {
        if (!content) return [];

        const regex = /#[\p{L}\p{N}_]+/gu;
        const matches = content.match(regex);

        if (!matches) return [];

        return [...new Set(matches.map((tag) => tag.toLowerCase()))];
    }
}
