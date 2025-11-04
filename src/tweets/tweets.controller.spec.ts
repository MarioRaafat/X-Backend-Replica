import { Test, TestingModule } from '@nestjs/testing';
import { TweetsController } from './tweets.controller';
import { TweetsService } from './tweets.service';
import { CreateTweetDTO } from './dto/create-tweet.dto';
import { UpdateTweetDTO } from './dto/update-tweet.dto';
import { BadRequestException } from '@nestjs/common';

describe('TweetsController', () => {
    let controller: TweetsController;
    let service: TweetsService;

    const mock_tweets_service = {
        createTweet: jest.fn(),
        getAllTweets: jest.fn(),
        getTweetById: jest.fn(),
        updateTweet: jest.fn(),
        deleteTweet: jest.fn(),
        repostTweet: jest.fn(),
        deleteRepost: jest.fn(),
        repostTweetWithQuote: jest.fn(),
        replyToTweet: jest.fn(),
        likeTweet: jest.fn(),
        unlikeTweet: jest.fn(),
        getTweetLikes: jest.fn(),
        getTweetReposts: jest.fn(),
        getTweetQuotes: jest.fn(),
        getTweetReplies: jest.fn(),
        updateQuoteTweet: jest.fn(),
        uploadImage: jest.fn(),
        uploadVideo: jest.fn(),
        incrementTweetViews: jest.fn(),
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
        service = module.get<TweetsService>(TweetsService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createTweet', () => {
        it('should create a tweet', async () => {
            const create_dto: CreateTweetDTO = { content: 'Test tweet' } as CreateTweetDTO;
            const user_id = 'user-123';
            const mock_tweet = { tweet_id: 'tweet-1', content: 'Test tweet' };

            mock_tweets_service.createTweet.mockResolvedValue(mock_tweet);

            const result = await controller.createTweet(create_dto, user_id);

            expect(service.createTweet).toHaveBeenCalledWith(create_dto, user_id);
            expect(result).toEqual(mock_tweet);
        });
    });

    describe('getAllTweets', () => {
        it('should return undefined (method not implemented)', async () => {
            const query_dto = { page: 1, limit: 20 };
            const user_id = 'user-123';

            const result = await controller.getAllTweets(query_dto as any, user_id);

            expect(result).toBeUndefined();
        });
    });

    describe('getTweetById', () => {
        it('should return a tweet by id', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const mock_tweet = { tweet_id, content: 'Test' };

            mock_tweets_service.getTweetById.mockResolvedValue(mock_tweet);

            const result = await controller.getTweetById(tweet_id, user_id);

            expect(service.getTweetById).toHaveBeenCalledWith(tweet_id, user_id);
            expect(result).toEqual(mock_tweet);
        });
    });

    describe('updateTweet', () => {
        it('should update a tweet', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const update_dto: UpdateTweetDTO = { content: 'Updated' } as UpdateTweetDTO;
            const mock_tweet = { tweet_id, content: 'Updated' };

            mock_tweets_service.updateTweet.mockResolvedValue(mock_tweet);

            const result = await controller.updateTweet(tweet_id, update_dto, user_id);

            expect(service.updateTweet).toHaveBeenCalledWith(update_dto, tweet_id, user_id);
            expect(result).toEqual(mock_tweet);
        });
    });

    describe('deleteTweet', () => {
        it('should delete a tweet', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';

            mock_tweets_service.deleteTweet.mockResolvedValue(undefined);

            await controller.deleteTweet(tweet_id, user_id);

            expect(service.deleteTweet).toHaveBeenCalledWith(tweet_id, user_id);
        });
    });

    describe('repostTweet', () => {
        it('should repost a tweet', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';

            mock_tweets_service.repostTweet.mockResolvedValue(undefined);

            await controller.repostTweet(tweet_id, user_id);

            expect(service.repostTweet).toHaveBeenCalledWith(tweet_id, user_id);
        });
    });

    describe('deleteRepost', () => {
        it('should delete a repost', async () => {
            const repost_id = 'repost-123';
            const user_id = 'user-123';

            mock_tweets_service.deleteRepost.mockResolvedValue(undefined);

            await controller.deleteRepost(repost_id, user_id);

            expect(service.deleteRepost).toHaveBeenCalledWith(repost_id, user_id);
        });
    });

    describe('quoteTweet', () => {
        it('should create a quote tweet', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const quote_dto = { content: 'My quote' } as any;
            const mock_quote = { tweet_id: 'quote-1' };

            mock_tweets_service.repostTweetWithQuote.mockResolvedValue(mock_quote);

            const result = await controller.quoteTweet(tweet_id, quote_dto, user_id);

            expect(service.repostTweetWithQuote).toHaveBeenCalledWith(tweet_id, user_id, quote_dto);
            expect(result).toEqual(mock_quote);
        });
    });

    describe('replyToTweet', () => {
        it('should create a reply to tweet', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const reply_dto = { content: 'My reply' } as any;
            const mock_reply = { tweet_id: 'reply-1' };

            mock_tweets_service.replyToTweet.mockResolvedValue(mock_reply);

            const result = await controller.replyToTweet(tweet_id, reply_dto, user_id);

            expect(service.replyToTweet).toHaveBeenCalledWith(tweet_id, user_id, reply_dto);
            expect(result).toEqual(mock_reply);
        });
    });

    describe('likeTweet', () => {
        it('should like a tweet', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';

            mock_tweets_service.likeTweet.mockResolvedValue(undefined);

            await controller.likeTweet(tweet_id, user_id);

            expect(service.likeTweet).toHaveBeenCalledWith(tweet_id, user_id);
        });
    });

    describe('unlikeTweet', () => {
        it('should unlike a tweet', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';

            mock_tweets_service.unlikeTweet.mockResolvedValue(undefined);

            await controller.unlikeTweet(tweet_id, user_id);

            expect(service.unlikeTweet).toHaveBeenCalledWith(tweet_id, user_id);
        });
    });

    describe('getTweetLikes', () => {
        it('should return tweet likes', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const query = { page: 1, limit: 20 };
            const mock_likes = { data: [], pagination: {} };

            mock_tweets_service.getTweetLikes.mockResolvedValue(mock_likes);

            const result = await controller.getTweetLikes(tweet_id, query, user_id);

            expect(service.getTweetLikes).toHaveBeenCalledWith(
                tweet_id,
                user_id,
                query.page,
                query.limit
            );
            expect(result).toEqual(mock_likes);
        });
    });

    describe('getTweetReposts', () => {
        it('should return tweet reposts', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const query = { page: 1, limit: 20 };
            const mock_reposts = { data: [], pagination: {} };

            mock_tweets_service.getTweetReposts.mockResolvedValue(mock_reposts);

            const result = await controller.getTweetReposts(tweet_id, query, user_id);

            expect(service.getTweetReposts).toHaveBeenCalledWith(
                tweet_id,
                user_id,
                query.page,
                query.limit
            );
            expect(result).toEqual(mock_reposts);
        });
    });

    describe('getTweetQuotes', () => {
        it('should return tweet quotes', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const query = { cursor: undefined, limit: 20 };
            const mock_quotes = { data: [], count: 0 };

            mock_tweets_service.getTweetQuotes.mockResolvedValue(mock_quotes);

            const result = await controller.getTweetQuotes(tweet_id, query, user_id);

            expect(service.getTweetQuotes).toHaveBeenCalledWith(
                tweet_id,
                user_id,
                query.cursor,
                query.limit
            );
            expect(result).toEqual(mock_quotes);
        });
    });

    describe('getTweetReplies', () => {
        it('should return tweet replies', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const query = { cursor: undefined, limit: 20 };
            const mock_replies = { data: [], next_cursor: null };

            mock_tweets_service.getTweetReplies.mockResolvedValue(mock_replies);

            const result = await controller.getTweetReplies(tweet_id, query, user_id);

            expect(service.getTweetReplies).toHaveBeenCalledWith(tweet_id, user_id, query);
            expect(result).toEqual(mock_replies);
        });
    });

    describe('uploadImage', () => {
        it('should upload an image', async () => {
            const user_id = 'user-123';
            const file = { originalname: 'test.jpg' } as Express.Multer.File;
            const mock_response = { url: 'https://example.com/image.jpg' };

            mock_tweets_service.uploadImage.mockResolvedValue(mock_response);

            const result = await controller.uploadImage(file, user_id);

            expect(service.uploadImage).toHaveBeenCalledWith(file, user_id);
            expect(result).toEqual(mock_response);
        });

        it('should throw BadRequestException if no file provided', async () => {
            const user_id = 'user-123';

            await expect(controller.uploadImage(undefined as any, user_id)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('uploadVideo', () => {
        it('should upload a video', async () => {
            const user_id = 'user-123';
            const file = { originalname: 'test.mp4' } as Express.Multer.File;
            const mock_response = { url: 'https://example.com/video.mp4' };

            mock_tweets_service.uploadVideo.mockResolvedValue(mock_response);

            const result = await controller.uploadVideo(file, user_id);

            expect(service.uploadVideo).toHaveBeenCalledWith(file, user_id);
            expect(result).toEqual(mock_response);
        });

        it('should throw BadRequestException if no file provided', async () => {
            const user_id = 'user-123';

            await expect(controller.uploadVideo(undefined as any, user_id)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('trackTweetView', () => {
        it('should track tweet view', async () => {
            const tweet_id = 'tweet-123';
            const user_id = 'user-123';
            const mock_response = { success: true };

            mock_tweets_service.incrementTweetViews.mockResolvedValue(mock_response);

            const result = await controller.trackTweetView(tweet_id, user_id);

            expect(service.incrementTweetViews).toHaveBeenCalledWith(tweet_id);
            expect(result).toEqual(mock_response);
        });
    });
});
