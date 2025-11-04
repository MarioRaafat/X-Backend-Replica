import { Test, TestingModule } from '@nestjs/testing';
import { TweetsController } from './tweets.controller';
import { TweetsService } from './tweets.service';

describe('TweetsController', () => {
    let controller: TweetsController;

    const mock_tweets_service = {
        createTweet: jest.fn(),
        updateTweet: jest.fn(),
        deleteTweet: jest.fn(),
        getTweetById: jest.fn(),
        likeTweet: jest.fn(),
        unlikeTweet: jest.fn(),
        getTweets: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TweetsController],
            providers: [
                {
                    provide: TweetsService,
                    useValue: mock_tweets_service,
                },
            ],
        }).compile();

        controller = module.get<TweetsController>(TweetsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
