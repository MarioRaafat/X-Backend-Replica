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
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TweetsService,
                {
                    provide: getRepositoryToken(Tweet),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(TweetLike),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(TweetRepost),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(TweetQuote),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(TweetReply),
                    useClass: Repository,
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest.fn(),
                    },
                },
            ],
        }).compile();

        tweets_service = module.get<TweetsService>(TweetsService);
        tweet_repo = module.get<Repository<Tweet>>(getRepositoryToken(Tweet));
        tweet_like_repo = module.get<Repository<TweetLike>>(getRepositoryToken(TweetLike));
        tweet_repost_repo = module.get<Repository<TweetRepost>>(getRepositoryToken(TweetRepost));
        tweet_quote_repo = module.get<Repository<TweetQuote>>(getRepositoryToken(TweetQuote));
        tweet_reply_repo = module.get<Repository<TweetReply>>(getRepositoryToken(TweetReply));
        data_source = module.get<DataSource>(DataSource);
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
