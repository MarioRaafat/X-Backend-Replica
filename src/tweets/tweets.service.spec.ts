import { Test, TestingModule } from '@nestjs/testing';
import { TweetsService } from './tweets.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tweet } from './entities/tweet.entity';
import { TweetLike } from './entities/tweet-like.entity';
import { TweetRepost } from './entities/tweet-repost.entity';
import { TweetQuote } from './entities/tweet-quote.entity';
import { TweetReply } from './entities/tweet-reply.entity';

describe('TweetsService', () => {
    let tweets_service: TweetsService;
    let tweet_repo: Repository<Tweet>;
    let tweet_like_repo: Repository<TweetLike>;
    let tweet_repost_repo: Repository<TweetRepost>;
    let tweet_quote_repo: Repository<TweetQuote>;
    let tweet_reply_repo: Repository<TweetReply>;
    let data_source: DataSource;

    beforeEach(async () => {
        const mock_repo = (): Record<string, jest.Mock> => ({
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            insert: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
        });

        const mock_tweet_repo = mock_repo();
        const mock_tweet_like_repo = mock_repo();
        const mock_tweet_repost_repo = mock_repo();
        const mock_tweet_quote_repo = mock_repo();
        const mock_tweet_reply_repo = mock_repo();

        const mock_query_runner = {
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
});
