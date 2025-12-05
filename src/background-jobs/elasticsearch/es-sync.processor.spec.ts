import { Test, TestingModule } from '@nestjs/testing';
import { EsSyncProcessor } from './es-sync.processor';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tweet } from 'src/tweets/entities';
import { User } from 'src/user/entities';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ELASTICSEARCH_INDICES } from 'src/elasticsearch/schemas';
import { TweetType } from 'src/shared/enums/tweet-types.enum';

describe('EsSyncProcessor', () => {
    let processor: EsSyncProcessor;
    let tweets_repository: jest.Mocked<Repository<Tweet>>;
    let user_repository: jest.Mocked<Repository<User>>;
    let elasticsearch_service: jest.Mocked<ElasticsearchService>;

    const mock_tweets_repository = {
        findOne: jest.fn(),
    };

    const mock_user_repository = {
        findOne: jest.fn(),
    };

    const mock_elasticsearch_service = {
        index: jest.fn(),
        delete: jest.fn(),
        updateByQuery: jest.fn(),
        deleteByQuery: jest.fn(),
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
                    provide: ElasticsearchService,
                    useValue: mock_elasticsearch_service,
                },
            ],
        }).compile();

        processor = module.get<EsSyncProcessor>(EsSyncProcessor);
        tweets_repository = module.get(getRepositoryToken(Tweet));
        user_repository = module.get(getRepositoryToken(User));
        elasticsearch_service = module.get(ElasticsearchService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleIndexTweet', () => {
        it('should index a tweet successfully', async () => {
            const mock_tweet: Partial<Tweet> = {
                tweet_id: 'tweet-123',
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
                user_id: 'user-123',
                images: [],
                videos: [],
                likes: [],
                replies: [],
                reposts: [],
                quotes: [],
                bookmarks: [],
                user: {
                    id: 'user-123',
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
                    tweet_id: 'tweet-123',
                    parent_id: undefined,
                    conversation_id: undefined,
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleIndexTweet(job);

            expect(mock_tweets_repository.findOne).toHaveBeenCalledWith({
                where: { tweet_id: 'tweet-123' },
                relations: ['user'],
            });
            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: 'tweet-123',
                document: expect.objectContaining({
                    tweet_id: 'tweet-123',
                    content: 'Test tweet',
                    author_id: 'user-123',
                    name: 'Test User',
                    username: 'testuser',
                }),
            });
            expect(logger_spy).toHaveBeenCalledWith('Indexed tweet tweet-123 to Elasticsearch');
        });

        it('should skip indexing if tweet not found', async () => {
            const job = {
                data: {
                    tweet_id: 'tweet-123',
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(null);

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.index).not.toHaveBeenCalled();
            expect(logger_spy).toHaveBeenCalledWith('Tweet tweet-123 not found, skipping index');
        });

        it('should handle indexing errors', async () => {
            const job = {
                data: {
                    tweet_id: 'tweet-123',
                },
            } as Job;

            const error = new Error('Index failed');
            mock_tweets_repository.findOne.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleIndexTweet(job)).rejects.toThrow('Index failed');
            expect(logger_spy).toHaveBeenCalledWith('Failed to index tweet tweet-123:', error);
        });

        it('should include parent_id and conversation_id when provided', async () => {
            const mock_tweet = {
                tweet_id: 'tweet-123',
                content: 'Reply tweet',
                user_id: 'user-123',
                user: {
                    name: 'Test User',
                    username: 'testuser',
                } as User,
            } as Tweet;

            const job = {
                data: {
                    tweet_id: 'tweet-123',
                    parent_id: 'parent-123',
                    conversation_id: 'conversation-123',
                },
            } as Job;

            mock_tweets_repository.findOne.mockResolvedValue(mock_tweet);
            mock_elasticsearch_service.index.mockResolvedValue({} as any);

            await processor.handleIndexTweet(job);

            expect(mock_elasticsearch_service.index).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: 'tweet-123',
                document: expect.objectContaining({
                    parent_id: 'parent-123',
                    conversation_id: 'conversation-123',
                }),
            });
        });
    });

    describe('handleDeleteTweet', () => {
        it('should delete a tweet successfully', async () => {
            const job = {
                data: {
                    tweet_id: 'tweet-123',
                },
            } as Job;

            mock_elasticsearch_service.delete.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleDeleteTweet(job);

            expect(mock_elasticsearch_service.delete).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                id: 'tweet-123',
            });
            expect(logger_spy).toHaveBeenCalledWith('Deleted tweet tweet-123 from Elasticsearch');
        });

        it('should skip if tweet not found in ES (404)', async () => {
            const job = {
                data: {
                    tweet_id: 'tweet-123',
                },
            } as Job;

            const error = {
                meta: { statusCode: 404 },
            };
            mock_elasticsearch_service.delete.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleDeleteTweet(job);

            expect(logger_spy).toHaveBeenCalledWith(
                'Tweet tweet-123 not found in ES, skipping delete'
            );
        });

        it('should handle delete errors', async () => {
            const job = {
                data: {
                    tweet_id: 'tweet-123',
                },
            } as Job;

            const error = new Error('Delete failed');
            mock_elasticsearch_service.delete.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleDeleteTweet(job)).rejects.toThrow('Delete failed');
            expect(logger_spy).toHaveBeenCalledWith('Failed to delete tweet tweet-123:', error);
        });
    });

    describe('handleUpdateTweetsAuthorInfo', () => {
        it('should update author info successfully', async () => {
            const mock_user = {
                id: 'user-123',
                name: 'Updated User',
                username: 'updateduser',
                followers: 100,
                following: 50,
                bio: 'Updated bio',
                avatar_url: 'http://example.com/new-avatar.jpg',
            } as User;

            const job = {
                data: {
                    user_id: 'user-123',
                },
            } as Job;

            mock_user_repository.findOne.mockResolvedValue(mock_user);
            mock_elasticsearch_service.updateByQuery.mockResolvedValue({ updated: 5 } as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleUpdateTweetsAuthorInfo(job);

            expect(mock_user_repository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' },
            });
            expect(mock_elasticsearch_service.updateByQuery).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                body: {
                    query: {
                        term: { author_id: 'user-123' },
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
                'Updated author info for 5 tweets by user user-123'
            );
        });

        it('should skip if user not found', async () => {
            const job = {
                data: {
                    user_id: 'user-123',
                },
            } as Job;

            mock_user_repository.findOne.mockResolvedValue(null);

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await processor.handleUpdateTweetsAuthorInfo(job);

            expect(mock_elasticsearch_service.updateByQuery).not.toHaveBeenCalled();
            expect(logger_spy).toHaveBeenCalledWith(
                'User user-123 not found for author info update'
            );
        });

        it('should handle update errors', async () => {
            const job = {
                data: {
                    user_id: 'user-123',
                },
            } as Job;

            const error = new Error('Update failed');
            mock_user_repository.findOne.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleUpdateTweetsAuthorInfo(job)).rejects.toThrow(
                'Update failed'
            );
            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to update author info for user-123:',
                error
            );
        });
    });

    describe('handleDeleteAuthor', () => {
        it('should delete tweets by author successfully', async () => {
            const job = {
                data: {
                    user_id: 'user-123',
                },
            } as Job;

            mock_elasticsearch_service.deleteByQuery.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await processor.handleDeleteAuthor(job);

            expect(mock_elasticsearch_service.deleteByQuery).toHaveBeenCalledWith({
                index: ELASTICSEARCH_INDICES.TWEETS,
                query: {
                    term: { author_id: 'user-123' },
                },
            });
            expect(logger_spy).toHaveBeenCalledWith('Delete tweets with author user-123');
        });

        it('should handle delete author errors', async () => {
            const job = {
                data: {
                    user_id: 'user-123',
                },
            } as Job;

            const error = new Error('Delete failed');
            mock_elasticsearch_service.deleteByQuery.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await expect(processor.handleDeleteAuthor(job)).rejects.toThrow('Delete failed');
            expect(logger_spy).toHaveBeenCalledWith(
                'Failed to delete tweets with author user-123:',
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
