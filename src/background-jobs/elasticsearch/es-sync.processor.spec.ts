import { Test, TestingModule } from '@nestjs/testing';
import { EsSyncProcessor } from './es-sync.processor';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tweet } from 'src/tweets/entities';
import { User, UserFollows } from 'src/user/entities';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { TweetType } from 'src/shared/enums/tweet-types.enum';

describe('EsSyncProcessor', () => {
    let processor: EsSyncProcessor;
    let tweets_repository: jest.Mocked<Repository<Tweet>>;
    let user_repository: jest.Mocked<Repository<User>>;
    let user_follows_repository: jest.Mocked<Repository<UserFollows>>;
    let elasticsearch_service: jest.Mocked<ElasticsearchService>;

    const mock_tweets_repository = {
        findOne: jest.fn(),
    };

    const mock_user_repository = {
        findOne: jest.fn(),
        delete: jest.fn(),
    };

    const mock_elasticsearch_service = {
        index: jest.fn(),
        delete: jest.fn(),
        bulk: jest.fn(),
        updateByQuery: jest.fn(),
        deleteByQuery: jest.fn(),
        get: jest.fn(),
    };

    const mock_user_follows_repository = {
        createQueryBuilder: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EsSyncProcessor,
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: mock_tweets_repository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mock_user_repository,
                },
                {
                    provide: getRepositoryToken(UserFollows),
                    useValue: mock_user_follows_repository,
                },
                {
                    provide: ElasticsearchService,
                    useValue: mock_elasticsearch_service,
                },
            ],
        }).compile();

        processor = module.get<EsSyncProcessor>(EsSyncProcessor);
        tweets_repository = module.get(getRepositoryToken(Tweet));
        user_repository = module.get(getRepositoryToken(User));
        user_follows_repository = module.get(getRepositoryToken(UserFollows));
        elasticsearch_service = module.get(ElasticsearchService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleIndexTweet', () => {
        it('should index a tweet successfully', async () => {
            const mock_tweet: Partial<Tweet> = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Test tweet',
                type: TweetType.TWEET,
                created_at: new Date(),
                updated_at: new Date(),
                num_likes: 10,
                num_reposts: 5,
                num_views: 100,
                num_replies: 3,
                num_quotes: 2,
                num_bookmarks: 0,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                images: [],
                videos: [],
                likes: [],
                replies: [],
                reposts: [],
                quotes: [],
                bookmarks: [],
                user: {
                    id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                    name: 'Test User',
                    username: 'testuser',
                    followers: 50,
                    following: 30,
                    bio: 'Test bio',
                    avatar_url: 'http://example.com/avatar.jpg',
                } as User,
            };

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: undefined,
                    conversation_id: undefined,
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleIndexTweet(job);

            expect(mock_tweets_repository.findOne).toHaveBeenCalledWith({
                where: { tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d' },
                relations: ['user'],
            });
            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                document: expect.objectContaining({
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    content: 'Test tweet',
                    author_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                    name: 'Test User',
                    username: 'testuser',
                }),
            });
            expect(logger_spy).toHaveBeenCalledWith(
                'Indexed tweet 0c059899-f706-4c8f-97d7-ba2e9fc22d6d to Elasticsearch'
            );
        });

        it('should skip indexing if tweet not found', async () => {
            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(null);

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.index).not.toHaveBeenCalled();
            expect(logger_spy).toHaveBeenCalledWith(
                'Tweet 0c059899-f706-4c8f-97d7-ba2e9fc22d6d not found, skipping index'
            );
        });

        it('should handle indexing errors', async () => {
            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                },
            } as Job;

            const error = new Error('Index failed');
            mock_tweets_repository.findOne.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleIndexTweet(job)).rejects.toThrow('Index failed');
            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to index tweet 0c059899-f706-4c8f-97d7-ba2e9fc22d6d:',
                error
            );
        });

        it('should include parent_id and conversation_id when provided', async () => {
            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Reply tweet',
                type: TweetType.REPLY,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                document: expect.objectContaining({
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                }),
            });
        });

        it('should use existing parent_id from ES when not provided in job data', async () => {
            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Reply tweet',
                type: TweetType.REPLY,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: undefined,
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                },
            } as Job;

            const existing_es_doc = {
                _source: {
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                },
            };

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.get.mockResolvedValue(existing_es_doc as any);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.get).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
            });
            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                document: expect.objectContaining({
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                }),
            });
        });

        it('should use existing conversation_id from ES when not provided in job data', async () => {
            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Reply tweet',
                type: TweetType.REPLY,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: undefined,
                },
            } as Job;

            const existing_es_doc = {
                _source: {
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                },
            };

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.get.mockResolvedValue(existing_es_doc as any);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.get).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
            });
            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                document: expect.objectContaining({
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                }),
            });
        });

        it('should use existing parent_id and conversation_id from ES when both not provided', async () => {
            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Reply tweet',
                type: TweetType.REPLY,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: undefined,
                    conversation_id: undefined,
                },
            } as Job;

            const existing_es_doc = {
                _source: {
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                },
            };

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.get.mockResolvedValue(existing_es_doc as any);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.get).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
            });
            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                document: expect.objectContaining({
                    parent_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    conversation_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                }),
            });
        });

        it('should skip ES lookup when tweet type is TWEET even if IDs not provided', async () => {
            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Regular tweet',
                type: TweetType.TWEET,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: undefined,
                    conversation_id: undefined,
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.get).not.toHaveBeenCalled();
            expect(mock_elasticsearch_service.index).toHaveBeenCalled();
        });

        it('should handle ES get error gracefully and continue with indexing', async () => {
            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Reply tweet',
                type: TweetType.REPLY,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: undefined,
                    conversation_id: undefined,
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.get.mockRejectedValue(new Error('Document not found'));
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'debug');

            await processor.handleIndexTweet(job);

            expect(logger_spy).toHaveBeenCalledWith(
                'No existing ES document for tweet 0c059899-f706-4c8f-97d7-ba2e9fc22d6d'
            );
            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                document: expect.objectContaining({
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                }),
            });
        });

        it('should prefer job data IDs over existing ES document IDs', async () => {
            const mock_tweet = {
                tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                content: 'Reply tweet',
                type: TweetType.REPLY,
                user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    parent_id: 'new-parent-id',
                    conversation_id: 'new-conversation-id',
                },
            } as Job;

            const existing_es_doc = {
                _source: {
                    parent_id: 'old-parent-id',
                    conversation_id: 'old-conversation-id',
                },
            };

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.get.mockResolvedValue(existing_es_doc as any);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.get).not.toHaveBeenCalled();
            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                document: expect.objectContaining({
                    parent_id: 'new-parent-id',
                    conversation_id: 'new-conversation-id',
                }),
            });
        });
    });

    describe('handleDeleteTweet', () => {
        it('should delete a tweet successfully', async () => {
            const job = {
                data: {
                    tweet_ids: ['tweet-123', 'tweet-321'],
                },
            } as Job;

            mock_elasticsearch_service.bulk.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleDeleteTweet(job);

            expect(mock_elasticsearch_service.bulk).toHaveBeenCalledWith({
                body: [
                    { delete: { _index: ELASTICSEARCH_INDICES.TWEETS, _id: 'tweet-123' } },
                    { delete: { _index: ELASTICSEARCH_INDICES.TWEETS, _id: 'tweet-321' } },
                ],
            });
            expect(logger_spy).toHaveBeenCalledWith('Deleted 2 tweets from Elasticsearch');
        });

        it('should skip if tweet not found in ES (404)', async () => {
            const job = {
                data: {
                    tweet_ids: ['tweet-123', 'tweet-321'],
                },
            } as Job;

            mock_elasticsearch_service.bulk.mockResolvedValue({
                errors: true,
                items: [
                    {
                        delete: {
                            _id: 'tweet-123',
                            status: 404,
                            error: { type: 'document_missing_exception' },
                        },
                    },
                    {
                        delete: {
                            _id: 'tweet-321',
                            status: 404,
                            error: { type: 'document_missing_exception' },
                        },
                    },
                ],
            });

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleDeleteTweet(job);

            expect(logger_spy).toHaveBeenCalledWith('Tweet tweet-123 not found in ES, skipping');
            expect(logger_spy).toHaveBeenCalledWith('Tweet tweet-321 not found in ES, skipping');
        });

        it('should handle delete errors', async () => {
            const job = {
                data: {
                    tweet_ids: ['tweet-123', 'tweet-321'],
                },
            } as Job;

            const error = new Error('Bulk delete failed');
            mock_elasticsearch_service.bulk.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleDeleteTweet(job)).rejects.toThrow('Bulk delete failed');

            expect(logger_spy).toHaveBeenCalledWith('Bulk delete failed:', error);
        });
    });

    describe('handleUpdateTweetsAuthorInfo', () => {
        it('should update author info successfully', async () => {
            const mock_user = {
                id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                name: 'Updated User',
                username: 'updateduser',
                followers: 100,
                following: 50,
                bio: 'Updated bio',
                avatar_url: 'http://example.com/new-avatar.jpg',
            } as User;

            const job = {
                data: {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
            } as Job;

            mock_user_repository.findOne.mockResolvedValue(mock_user);
            mock_elasticsearch_service.updateByQuery.mockResolvedValue({ updated: 5 } as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleUpdateTweetsAuthorInfo(job);

            expect(mock_user_repository.findOne).toHaveBeenCalledWith({
                where: { id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6' },
            });
            expect(mock_elasticsearch_service.updateByQuery).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    query: {
                        term: { author_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6' },
                    },
                    script: expect.objectContaining({
                        source: expect.any(String),
                        params: {
                            name: 'Updated User',
                            username: 'updateduser',
                            followers: 100,
                            following: 50,
                            bio: 'Updated bio',
                            avatar_url: 'http://example.com/new-avatar.jpg',
                        },
                    }),
                },
            });
            expect(logger_spy).toHaveBeenCalledWith(
                'Updated author info for 5 tweets by user 1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6'
            );
        });

        it('should skip if user not found', async () => {
            const job = {
                data: {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
            } as Job;

            mock_user_repository.findOne.mockResolvedValue(null);

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleUpdateTweetsAuthorInfo(job);

            expect(mock_elasticsearch_service.updateByQuery).not.toHaveBeenCalled();
            expect(logger_spy).toHaveBeenCalledWith(
                'User 1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6 not found for author info update'
            );
        });

        it('should handle update errors', async () => {
            const job = {
                data: {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
            } as Job;

            const error = new Error('Update failed');
            mock_user_repository.findOne.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleUpdateTweetsAuthorInfo(job)).rejects.toThrow(
                'Update failed'
            );
            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to update author info for 1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6:',
                error
            );
        });
    });

    describe('handleDeleteAuthor', () => {
        it('should delete user, their tweets, and decrement follow counts successfully', async () => {
            const job = {
                data: {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
            } as Job;

            const mock_follows = [
                {
                    follower_id: '6ba9c7cf-302b-433f-8642-50de81ef0372',
                    followed_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
                {
                    follower_id: '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                    followed_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
                { follower_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6', followed_id: 'user-999' },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mock_follows),
            };

            mock_user_follows_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_user_repository.delete.mockResolvedValue({} as any);
            mock_elasticsearch_service.deleteByQuery.mockResolvedValue({} as any);
            mock_elasticsearch_service.updateByQuery.mockResolvedValue({ updated: 10 } as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleDeleteAuthor(job);

            expect(mock_user_follows_repository.createQueryBuilder).toHaveBeenCalledWith('uf');
            expect(mock_query_builder.where).toHaveBeenCalledWith('uf.followed_id = :id', {
                id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
            });
            expect(mock_query_builder.orWhere).toHaveBeenCalledWith('uf.follower_id = :id', {
                id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
            });

            expect(mock_user_repository.delete).toHaveBeenCalledWith(
                '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6'
            );

            expect(mock_elasticsearch_service.deleteByQuery).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                query: {
                    term: { author_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6' },
                },
            });

            expect(mock_elasticsearch_service.updateByQuery).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    query: {
                        terms: {
                            author_id: [
                                '6ba9c7cf-302b-433f-8642-50de81ef0372',
                                '4fa1b0f4-a059-4b6f-ab1f-137217d33d3c',
                            ],
                        },
                    },
                    script: {
                        source: expect.stringContaining('following'),
                    },
                },
                conflicts: 'proceed',
                refresh: false,
            });

            expect(mock_elasticsearch_service.updateByQuery).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    query: {
                        terms: { author_id: ['user-999'] },
                    },
                    script: {
                        source: expect.stringContaining('followers'),
                    },
                },
                conflicts: 'proceed',
                refresh: false,
            });

            expect(logger_spy).toHaveBeenCalledWith(
                'Delete tweets with author 1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6'
            );
            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Decremented following in 10 tweets')
            );
            expect(logger_spy).toHaveBeenCalledWith(
                expect.stringContaining('Decremented followers in 10 tweets')
            );
        });

        it('should handle case with no follows', async () => {
            const job = {
                data: {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
            } as Job;

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mock_user_follows_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_user_repository.delete.mockResolvedValue({} as any);
            mock_elasticsearch_service.deleteByQuery.mockResolvedValue({} as any);

            await processor.handleDeleteAuthor(job);

            expect(mock_user_repository.delete).toHaveBeenCalledWith(
                '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6'
            );
            expect(mock_elasticsearch_service.deleteByQuery).toHaveBeenCalled();
            expect(mock_elasticsearch_service.updateByQuery).not.toHaveBeenCalled();
        });

        it('should continue if user follows query fails', async () => {
            const job = {
                data: {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
            } as Job;

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockRejectedValue(new Error('Query failed')),
            };

            mock_user_follows_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_user_repository.delete.mockResolvedValue({} as any);
            mock_elasticsearch_service.deleteByQuery.mockResolvedValue({} as any);

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            await processor.handleDeleteAuthor(job);

            expect(console_spy).toHaveBeenCalled();
            expect(mock_user_repository.delete).toHaveBeenCalledWith(
                '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6'
            );
            expect(mock_elasticsearch_service.deleteByQuery).toHaveBeenCalled();

            console_spy.mockRestore();
        });

        it('should handle delete tweets errors and throw', async () => {
            const job = {
                data: {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                },
            } as Job;

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mock_user_follows_repository.createQueryBuilder.mockReturnValue(mock_query_builder);
            mock_user_repository.delete.mockResolvedValue({} as any);

            const error = new Error('Delete failed');
            mock_elasticsearch_service.deleteByQuery.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleDeleteAuthor(job)).rejects.toThrow('Delete failed');
            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to delete tweets with author 1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6:',
                error
            );
        });
    });

    describe('handleFollow', () => {
        it('should update follow counts successfully', async () => {
            const mock_follower = {
                id: 'user-1',
                following: 10,
            } as User;

            const mock_followed = {
                id: 'user-2',
                followers: 20,
            } as User;

            const job = {
                data: {
                    follower_id: 'user-1',
                    followed_id: 'user-2',
                },
            } as Job;

            mock_user_repository.findOne.mockImplementation((options: any) => {
                if (options.where.id === 'user-1') {
                    return Promise.resolve(mock_follower);
                }
                if (options.where.id === 'user-2') {
                    return Promise.resolve(mock_followed);
                }
                return Promise.resolve(null);
            });

            mock_elasticsearch_service.updateByQuery.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleFollow(job);

            expect(mock_elasticsearch_service.updateByQuery).toHaveBeenCalledTimes(2);
            expect(logger_spy).toHaveBeenCalledWith(
                'Updated follow info for tweets by users user-1 and user-2'
            );
        });

        it('should skip if follower not found', async () => {
            const mock_followed = {
                id: 'user-2',
                followers: 20,
            } as User;

            const job = {
                data: {
                    follower_id: 'user-1',
                    followed_id: 'user-2',
                },
            } as Job;

            mock_user_repository.findOne.mockImplementation((options: any) => {
                if (options.where.id === 'user-2') {
                    return Promise.resolve(mock_followed);
                }
                return Promise.resolve(null);
            });

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleFollow(job);

            expect(mock_elasticsearch_service.updateByQuery).not.toHaveBeenCalled();
            expect(logger_spy).toHaveBeenCalledWith('User user-1 not found for author info update');
        });

        it('should skip if followed user not found', async () => {
            const mock_follower = {
                id: 'user-1',
                following: 10,
            } as User;

            const job = {
                data: {
                    follower_id: 'user-1',
                    followed_id: 'user-2',
                },
            } as Job;

            mock_user_repository.findOne.mockImplementation((options: any) => {
                if (options.where.id === 'user-1') {
                    return Promise.resolve(mock_follower);
                }
                return Promise.resolve(null);
            });

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleFollow(job);

            expect(mock_elasticsearch_service.updateByQuery).not.toHaveBeenCalled();
            expect(logger_spy).toHaveBeenCalledWith('User user-2 not found for author info update');
        });

        it('should handle follow errors', async () => {
            const job = {
                data: {
                    follower_id: 'user-1',
                    followed_id: 'user-2',
                },
            } as Job;

            const error = new Error('Follow update failed');
            mock_user_repository.findOne.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleFollow(job)).rejects.toThrow('Follow update failed');
            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to update follow info for tweets by users user-1 and user-2:',
                error
            );
        });
    });
});
