import { Test, TestingModule } from '@nestjs/testing';
import { TweetsService } from './tweets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tweet } from './entities/tweet.entity';
import { TweetLike } from './entities/tweet-like.entity';
import { TweetRepost } from './entities/tweet-repost.entity';
import { TweetQuote } from './entities/tweet-quote.entity';
import { TweetReply } from './entities/tweet-reply.entity';
import { CreateTweetDTO } from './dto/create-tweet.dto';

describe('TweetsService', () => {
    let tweets_service: TweetsService;
    let tweet_repo: Repository<Tweet>;
    let tweet_like_repo: Repository<TweetLike>;
    let tweet_repost_repo: Repository<TweetRepost>;
    let tweet_quote_repo: Repository<TweetQuote>;
    let tweet_reply_repo: Repository<TweetReply>;
    let data_source: DataSource;
    let mock_query_runner: any;

    beforeEach(async () => {
        const mock_repo = (): Record<string, jest.Mock> => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            preload: jest.fn(),
            insert: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
        });

        const mock_tweet_repo = mock_repo();
        const mock_tweet_like_repo = mock_repo();
        const mock_tweet_repost_repo = mock_repo();
        const mock_tweet_quote_repo = mock_repo();
        const mock_tweet_reply_repo = mock_repo();

        mock_query_runner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                create: jest.fn(),
                save: jest.fn(),
                insert: jest.fn(),
                delete: jest.fn(),
                increment: jest.fn(),
                decrement: jest.fn(),
            },
        };

        const mock_data_source = {
            createQueryRunner: jest.fn(() => mock_query_runner),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TweetsService,
                { provide: getRepositoryToken(Tweet), useValue: mock_tweet_repo },
                { provide: getRepositoryToken(TweetLike), useValue: mock_tweet_like_repo },
                { provide: getRepositoryToken(TweetRepost), useValue: mock_tweet_repost_repo },
                { provide: getRepositoryToken(TweetQuote), useValue: mock_tweet_quote_repo },
                { provide: getRepositoryToken(TweetReply), useValue: mock_tweet_reply_repo },
                { provide: DataSource, useValue: mock_data_source },
            ],
        }).compile();

        tweets_service = module.get<TweetsService>(TweetsService);
        tweet_repo = mock_tweet_repo as unknown as Repository<Tweet>;
        tweet_like_repo = mock_tweet_like_repo as unknown as Repository<TweetLike>;
        tweet_repost_repo = mock_tweet_repost_repo as unknown as Repository<TweetRepost>;
        tweet_quote_repo = mock_tweet_quote_repo as unknown as Repository<TweetQuote>;
        tweet_reply_repo = mock_tweet_reply_repo as unknown as Repository<TweetReply>;
        data_source = mock_data_source as unknown as DataSource;
    });

    it('should be defined', () => {
        expect(tweets_service).toBeDefined();
        expect(tweet_repo).toBeDefined();
        expect(tweet_like_repo).toBeDefined();
        expect(tweet_repost_repo).toBeDefined();
        expect(tweet_quote_repo).toBeDefined();
        expect(tweet_reply_repo).toBeDefined();
        expect(data_source).toBeDefined();
    });

    describe('createTweet', () => {
        it('should create, save, and return the tweet with user relation', async () => {
            const mock_user_id = 'user-123';
            const mock_tweet_dto: CreateTweetDTO = { content: 'Hello world!' } as CreateTweetDTO;
            const mock_new_tweet = {
                tweet_id: 'tweet-1',
                user_id: mock_user_id,
                ...mock_tweet_dto,
            };
            const mock_tweet_with_user = {
                ...mock_new_tweet,
                user: { id: mock_user_id, username: 'John' },
            };

            const create_spy = jest
                .spyOn(tweet_repo, 'create')
                .mockReturnValue(mock_new_tweet as any);
            const save_spy = jest
                .spyOn(tweet_repo, 'save')
                .mockResolvedValue(mock_new_tweet as any);
            const find_one_spy = jest
                .spyOn(tweet_repo, 'findOne')
                .mockResolvedValue(mock_tweet_with_user as any);

            const result = await tweets_service.createTweet(mock_tweet_dto, mock_user_id);

            expect(create_spy).toHaveBeenCalledWith({
                user_id: mock_user_id,
                ...mock_tweet_dto,
            });
            expect(save_spy).toHaveBeenCalledWith(mock_new_tweet);
            expect(find_one_spy).toHaveBeenCalledWith({
                where: { tweet_id: mock_new_tweet.tweet_id },
                relations: ['user'],
            });
            expect(result).toEqual(mock_tweet_with_user);
        });

        it('should throw NotFoundException if tweet not found after creation', async () => {
            const mock_user_id = 'user-404';
            const mock_tweet_dto: CreateTweetDTO = { content: 'Missing tweet' } as CreateTweetDTO;
            const mock_new_tweet = {
                tweet_id: 'tweet-404',
                user_id: mock_user_id,
                ...mock_tweet_dto,
            };

            const create_spy2 = jest
                .spyOn(tweet_repo, 'create')
                .mockReturnValue(mock_new_tweet as any);
            const save_spy2 = jest
                .spyOn(tweet_repo, 'save')
                .mockResolvedValue(mock_new_tweet as any);
            const find_one_spy2 = jest.spyOn(tweet_repo, 'findOne').mockResolvedValue(null as any);

            await expect(tweets_service.createTweet(mock_tweet_dto, mock_user_id)).rejects.toThrow(
                'Tweet not found after creation'
            );

            expect(create_spy2).toHaveBeenCalled();
            expect(save_spy2).toHaveBeenCalled();
            expect(find_one_spy2).toHaveBeenCalled();
        });

        it('should rethrow errors from repository methods', async () => {
            const mock_user_id = 'user-err';
            const mock_tweet_dto: CreateTweetDTO = { content: 'oops' } as CreateTweetDTO;
            const db_error = new Error('Database failure');

            const create_spy3 = jest
                .spyOn(tweet_repo, 'create')
                .mockReturnValue({ tweet_id: 't1', ...mock_tweet_dto } as any);
            const save_spy3 = jest.spyOn(tweet_repo, 'save').mockRejectedValue(db_error);

            await expect(tweets_service.createTweet(mock_tweet_dto, mock_user_id)).rejects.toThrow(
                'Database failure'
            );

            expect(save_spy3).toHaveBeenCalled();
        });
    });

    describe('updateTweet', () => {
        it('should preload, save, and return the updated tweet with user relation', async () => {
            const mock_tweet_id = 'tweet-123';
            const mock_update_dto = { content: 'Updated tweet text' };
            const mock_updated_tweet = { tweet_id: mock_tweet_id, ...mock_update_dto };
            const mock_tweet_with_user = {
                ...mock_updated_tweet,
                user: { id: 'user-1', username: 'John' },
            };

            const preload_spy = jest
                .spyOn(tweet_repo, 'preload')
                .mockResolvedValue(mock_updated_tweet as any);
            const save_spy = jest
                .spyOn(tweet_repo, 'save')
                .mockResolvedValue(mock_updated_tweet as any);
            const find_one_spy = jest
                .spyOn(tweet_repo, 'findOne')
                .mockResolvedValue(mock_tweet_with_user as any);

            const result = await tweets_service.updateTweet(mock_update_dto as any, mock_tweet_id);

            expect(preload_spy).toHaveBeenCalledWith({
                tweet_id: mock_tweet_id,
                ...mock_update_dto,
            });
            expect(save_spy).toHaveBeenCalledWith(mock_updated_tweet);
            expect(find_one_spy).toHaveBeenCalledWith({
                where: { tweet_id: mock_tweet_id },
                relations: ['user'],
            });
            expect(result).toEqual(mock_tweet_with_user);
        });

        it('should throw NotFoundException if tweet not found during preload', async () => {
            const mock_tweet_id = 'missing-tweet';
            const mock_update_dto = { content: 'Nothing here' };

            const preload_spy2 = jest.spyOn(tweet_repo, 'preload').mockResolvedValue(null as any);

            await expect(
                tweets_service.updateTweet(mock_update_dto as any, mock_tweet_id)
            ).rejects.toThrow('Tweet not found');

            expect(preload_spy2).toHaveBeenCalledWith({
                tweet_id: mock_tweet_id,
                ...mock_update_dto,
            });
        });

        it('should throw NotFoundException if tweet not found after update', async () => {
            const mock_tweet_id = 'tweet-456';
            const mock_update_dto = { content: 'Still missing' };
            const mock_preloaded_tweet = { tweet_id: mock_tweet_id, ...mock_update_dto };

            const preload_spy3 = jest
                .spyOn(tweet_repo, 'preload')
                .mockResolvedValue(mock_preloaded_tweet as any);
            const save_spy3 = jest
                .spyOn(tweet_repo, 'save')
                .mockResolvedValue(mock_preloaded_tweet as any);
            const find_one_spy3 = jest.spyOn(tweet_repo, 'findOne').mockResolvedValue(null as any);

            await expect(
                tweets_service.updateTweet(mock_update_dto as any, mock_tweet_id)
            ).rejects.toThrow('Tweet not found after update');

            expect(preload_spy3).toHaveBeenCalled();
            expect(save_spy3).toHaveBeenCalled();
            expect(find_one_spy3).toHaveBeenCalled();
        });

        it('should rethrow any unexpected repository errors', async () => {
            const mock_tweet_id = 'tweet-err';
            const mock_update_dto = { content: 'Boom!' };
            const db_error = new Error('Database failure');

            const preload_spy4 = jest.spyOn(tweet_repo, 'preload').mockRejectedValue(db_error);

            await expect(
                tweets_service.updateTweet(mock_update_dto as any, mock_tweet_id)
            ).rejects.toThrow('Database failure');

            expect(preload_spy4).toHaveBeenCalled();
        });
    });

    describe('deleteTweet', () => {
        it('should delete the tweet successfully when it exists', async () => {
            const mock_tweet_id = 'tweet-123';
            const mock_delete_result = { affected: 1 };

            const delete_spy = jest
                .spyOn(tweet_repo, 'delete')
                .mockResolvedValue(mock_delete_result as any);

            await expect(tweets_service.deleteTweet(mock_tweet_id)).resolves.toBeUndefined();

            expect(delete_spy).toHaveBeenCalledWith({ tweet_id: mock_tweet_id });
        });

        it('should throw NotFoundException if no tweet was deleted', async () => {
            const mock_tweet_id = 'missing-tweet';
            const mock_delete_result = { affected: 0 };

            const delete_spy2 = jest
                .spyOn(tweet_repo, 'delete')
                .mockResolvedValue(mock_delete_result as any);

            await expect(tweets_service.deleteTweet(mock_tweet_id)).rejects.toThrow(
                'Tweet not found'
            );

            expect(delete_spy2).toHaveBeenCalledWith({ tweet_id: mock_tweet_id });
        });

        it('should rethrow any unexpected errors from repository', async () => {
            const mock_tweet_id = 'tweet-err';
            const db_error = new Error('Database failure');

            const delete_spy3 = jest.spyOn(tweet_repo, 'delete').mockRejectedValue(db_error);

            await expect(tweets_service.deleteTweet(mock_tweet_id)).rejects.toThrow(
                'Database failure'
            );

            expect(delete_spy3).toHaveBeenCalledWith({ tweet_id: mock_tweet_id });
        });
    });

    describe('getTweetById', () => {
        it('should return the tweet with user relation when found', async () => {
            const mock_tweet_id = 'tweet-123';
            const mock_tweet = {
                tweet_id: mock_tweet_id,
                content: 'Hello world!',
                user: { id: 'user-1', username: 'John' },
            };

            const find_one_spy = jest
                .spyOn(tweet_repo, 'findOne')
                .mockResolvedValue(mock_tweet as any);

            const result = await tweets_service.getTweetById(mock_tweet_id);

            expect(find_one_spy).toHaveBeenCalledWith({
                where: { tweet_id: mock_tweet_id },
                relations: ['user'],
            });
            expect(result).toEqual(mock_tweet);
        });

        it('should throw NotFoundException if tweet not found', async () => {
            const mock_tweet_id = 'missing-tweet';

            const find_one_spy2 = jest.spyOn(tweet_repo, 'findOne').mockResolvedValue(null as any);

            await expect(tweets_service.getTweetById(mock_tweet_id)).rejects.toThrow(
                'Tweet Not Found'
            );

            expect(find_one_spy2).toHaveBeenCalledWith({
                where: { tweet_id: mock_tweet_id },
                relations: ['user'],
            });
        });

        it('should rethrow any unexpected errors from repository', async () => {
            const mock_tweet_id = 'tweet-err';
            const db_error = new Error('Database failure');

            const find_one_spy3 = jest.spyOn(tweet_repo, 'findOne').mockRejectedValue(db_error);

            await expect(tweets_service.getTweetById(mock_tweet_id)).rejects.toThrow(
                'Database failure'
            );

            expect(find_one_spy3).toHaveBeenCalledWith({
                where: { tweet_id: mock_tweet_id },
                relations: ['user'],
            });
        });
    });

    describe('likeTweet', () => {
        it('should create a new like, insert it, increment num_likes, and commit the transaction', async () => {
            const mock_tweet_id = 'tweet-123';
            const mock_user_id = 'user-456';
            const mock_new_like = {
                tweet: { tweet_id: mock_tweet_id },
                user: { id: mock_user_id },
            };

            const create_spy = jest
                .spyOn(mock_query_runner.manager, 'create')
                .mockReturnValue(mock_new_like);
            const insert_spy = jest
                .spyOn(mock_query_runner.manager, 'insert')
                .mockResolvedValue({} as any);
            const increment_spy = jest
                .spyOn(mock_query_runner.manager, 'increment')
                .mockResolvedValue({} as any);
            const commit_spy = jest.spyOn(mock_query_runner, 'commitTransaction');

            await tweets_service.likeTweet(mock_tweet_id, mock_user_id);

            expect(mock_query_runner.connect).toHaveBeenCalled();
            expect(mock_query_runner.startTransaction).toHaveBeenCalled();
            expect(create_spy).toHaveBeenCalledWith(expect.any(Function), mock_new_like);
            expect(insert_spy).toHaveBeenCalledWith(expect.any(Function), mock_new_like);
            expect(increment_spy).toHaveBeenCalledWith(
                expect.any(Function),
                { tweet_id: mock_tweet_id },
                'num_likes',
                1
            );
            expect(commit_spy).toHaveBeenCalled();
        });

        it('should rollback and throw NotFoundException if tweet does not exist (foreign key error)', async () => {
            const mock_tweet_id = 'missing-tweet';
            const mock_user_id = 'user-123';
            const mock_error = { code: '23503' }; // PostgresErrorCodes.FOREIGN_KEY_VIOLATION

            jest.spyOn(mock_query_runner.manager, 'create').mockReturnValue({} as any);
            jest.spyOn(mock_query_runner.manager, 'insert').mockRejectedValue(mock_error);

            await expect(tweets_service.likeTweet(mock_tweet_id, mock_user_id)).rejects.toThrow(
                'Tweet not found'
            );

            expect(mock_query_runner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should rollback and throw BadRequestException if user already liked the tweet (unique constraint)', async () => {
            const mock_tweet_id = 'tweet-321';
            const mock_user_id = 'user-999';
            const mock_error = { code: '23505' }; // PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION

            jest.spyOn(mock_query_runner.manager, 'create').mockReturnValue({} as any);
            jest.spyOn(mock_query_runner.manager, 'insert').mockRejectedValue(mock_error);

            await expect(tweets_service.likeTweet(mock_tweet_id, mock_user_id)).rejects.toThrow(
                'User already liked this tweet'
            );

            expect(mock_query_runner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should rollback and rethrow unexpected errors', async () => {
            const mock_tweet_id = 'tweet-err';
            const mock_user_id = 'user-err';
            const db_error = new Error('Database crashed');

            jest.spyOn(mock_query_runner.manager, 'create').mockReturnValue({} as any);
            jest.spyOn(mock_query_runner.manager, 'insert').mockRejectedValue(db_error);

            await expect(tweets_service.likeTweet(mock_tweet_id, mock_user_id)).rejects.toThrow(
                'Database crashed'
            );

            expect(mock_query_runner.rollbackTransaction).toHaveBeenCalled();
        });
    });

    describe('unLikeTweet', () => {
        it('should delete like, decrement num_likes, and commit transaction', async () => {
            const mock_tweet_id = 'tweet-789';
            const mock_user_id = 'user-123';

            const delete_result = { affected: 1 };
            const delete_spy = jest
                .spyOn(mock_query_runner.manager, 'delete')
                .mockResolvedValue(delete_result as any);
            const decrement_spy = jest
                .spyOn(mock_query_runner.manager, 'decrement')
                .mockResolvedValue({} as any);
            const commit_spy = jest.spyOn(mock_query_runner, 'commitTransaction');

            await tweets_service.unlikeTweet(mock_tweet_id, mock_user_id);

            expect(mock_query_runner.connect).toHaveBeenCalled();
            expect(mock_query_runner.startTransaction).toHaveBeenCalled();
            expect(delete_spy).toHaveBeenCalledWith(expect.any(Function), {
                tweet_id: mock_tweet_id,
                user_id: mock_user_id,
            });
            expect(decrement_spy).toHaveBeenCalledWith(
                expect.any(Function),
                { tweet_id: mock_tweet_id },
                'num_likes',
                1
            );
            expect(commit_spy).toHaveBeenCalled();
        });

        it('should rollback and throw NotFoundException if user did not like tweet or tweet missing', async () => {
            const mock_tweet_id = 'tweet-missing';
            const mock_user_id = 'user-missing';

            const delete_result = { affected: 0 };
            jest.spyOn(mock_query_runner.manager, 'delete').mockResolvedValue(delete_result as any);
            jest.spyOn(mock_query_runner.manager, 'decrement').mockResolvedValue({} as any);

            await expect(tweets_service.unLikeTweet(mock_tweet_id, mock_user_id)).rejects.toThrow(
                'User seemed to not like this tweet or tweet does not exist'
            );

            expect(mock_query_runner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should rollback and rethrow unexpected errors', async () => {
            const mock_tweet_id = 'tweet-error';
            const mock_user_id = 'user-error';
            const db_error = new Error('Database crash');

            jest.spyOn(mock_query_runner.manager, 'delete').mockRejectedValue(db_error);

            await expect(tweets_service.unLikeTweet(mock_tweet_id, mock_user_id)).rejects.toThrow(
                'Database crash'
            );

            expect(mock_query_runner.rollbackTransaction).toHaveBeenCalled();
        });
    });
});
