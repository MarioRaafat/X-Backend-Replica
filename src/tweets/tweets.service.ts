import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
import { CreateTweetDTO, UpdateTweetDTO } from './dto';
import { GetTweetsQueryDto } from './dto/get-tweets-query.dto';
import { PostgresErrorCodes } from './enums/postgres-error-codes';
import { Tweet } from './entities/tweet.entity';
import { TweetLike } from './entities/tweet-like.entity';
import { TweetRepost } from './entities/tweet-repost.entity';
import { TweetQuote } from './entities/tweet-quote.entity';
import { TweetReply } from './entities/tweet-reply.entity';

@Injectable()
export class TweetsService {
    constructor(
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetLike)
        private readonly tweet_like_repository: Repository<TweetLike>,
        @InjectRepository(TweetRepost)
        private readonly tweet_repost_repository: Repository<TweetRepost>,
        @InjectRepository(TweetQuote)
        private readonly tweet_quote_repository: Repository<TweetQuote>,
        @InjectRepository(TweetReply)
        private readonly tweet_reply_repository: Repository<TweetReply>,
        private data_source: DataSource
    ) {}
    /**
     * Handles image upload processing
     * @param file - The uploaded image file (in memory, not saved to disk)
     * @param _user_id - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    uploadImage(file: Express.Multer.File, _user_id: string): Promise<UploadMediaResponseDTO> {
        // TODO: Implement image upload logic
        // - Upload to cloud storage (S3, Cloudinary, etc.)
        // - Save file metadata to database
        // - Process/compress image if needed
        // - Generate thumbnail
        // - Return file URL and metadata

        // File is in memory as file.buffer
        // NOT saved to disk - discarded after request
        return Promise.resolve({
            url: `https://your-cdn.com/placeholder-url`, // Placeholder URL
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        });
    }

    /**
     * Handles video upload processing
     * @param file - The uploaded video file (in memory, not saved to disk)
     * @param _user_id - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    uploadVideo(file: Express.Multer.File, _user_id: string): Promise<UploadMediaResponseDTO> {
        // TODO: Implement video upload logic
        // - Upload to cloud storage (S3, Cloudinary, etc.)
        // - Save file metadata to database
        // - Transcode video if needed
        // - Generate thumbnail/preview
        // - Return file URL and metadata

        // File is in memory as file.buffer
        // NOT saved to disk - discarded after request
        return Promise.resolve({
            url: `https://your-cdn.com/placeholder-url`, // Placeholder URL
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        });
    }

    async createTweet(tweet: CreateTweetDTO, user_id: string): Promise<Tweet> {
        try {
            const new_tweet = this.tweet_repository.create({
                user_id,
                ...tweet,
            });
            await this.tweet_repository.save(new_tweet);
            // Fetch the tweet with user relation to return complete data
            const tweet_with_user = await this.tweet_repository.findOne({
                where: { tweet_id: new_tweet.tweet_id },
                relations: ['user'],
            });
            if (!tweet_with_user) throw new NotFoundException('Tweet not found after creation');
            return tweet_with_user;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async updateTweet(tweet: UpdateTweetDTO, tweet_id: string): Promise<Tweet> {
        try {
            const updated_tweet = await this.tweet_repository.preload({
                tweet_id,
                ...tweet,
            });
            if (!updated_tweet) throw new NotFoundException('Tweet not found');
            await this.tweet_repository.save(updated_tweet);
            // Fetch the tweet with user relation to return complete data
            const tweet_with_user = await this.tweet_repository.findOne({
                where: { tweet_id },
                relations: ['user'],
            });
            if (!tweet_with_user) throw new NotFoundException('Tweet not found after update');
            return tweet_with_user;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // In case of soft delete, the tweet linked features such as likes, reposts, replies won't be deleted automatically,
    // which delete would we use?
    async deleteTweet(tweet_id: string): Promise<void> {
        try {
            const affected_entities = await this.tweet_repository.delete({ tweet_id });
            if (affected_entities.affected === 0) throw new NotFoundException('Tweet not found');
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getTweetById(tweet_id: string): Promise<Tweet> {
        try {
            const tweet = await this.tweet_repository.findOne({
                where: { tweet_id },
                relations: ['user'],
            });
            if (!tweet) throw new NotFoundException('Tweet Not Found');
            return tweet;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async likeTweet(tweet_id: string, user_id: string) {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const new_like = query_runner.manager.create(TweetLike, {
                tweet: { tweet_id },
                user: { id: user_id },
            });
            await query_runner.manager.insert(TweetLike, new_like);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_likes', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            if (error.code === PostgresErrorCodes.FOREIGN_KEY_VIOLATION)
                throw new NotFoundException('Tweet not found');
            if (error.code === PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION)
                throw new BadRequestException('User already liked this tweet');
            throw error;
        }
    }

    async unLikeTweet(tweet_id: string, user_id: string) {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const affected_entities = await query_runner.manager.delete(TweetLike, {
                tweet_id,
                user_id,
            });
            if (affected_entities.affected === 0)
                throw new NotFoundException(
                    'User seemed to not like this tweet or tweet does not exist'
                );
            await query_runner.manager.decrement(Tweet, { tweet_id }, 'num_likes', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            console.error(error);
            throw error;
        }
    }

    async repostTweetWithQuote(tweet_id: string, user_id: string, quote: CreateTweetDTO) {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const new_quote_tweet = query_runner.manager.create(TweetQuote, {
                original_tweet_id: tweet_id,
                user_id,
                quote_tweet: { ...quote, user_id },
            });
            await Promise.all([
                query_runner.manager.save(TweetQuote, new_quote_tweet),
                query_runner.manager.increment(Tweet, { tweet_id }, 'num_reposts', 1),
            ]);
            await query_runner.commitTransaction();
        } catch (error) {
            console.error(error);
            await query_runner.rollbackTransaction();
            throw error;
        }
    }

    async repostTweet(tweet_id: string, user_id: string) {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const new_repost = query_runner.manager.create(TweetRepost, {
                tweet_id,
                user_id,
            });
            await Promise.all([
                query_runner.manager.save(TweetRepost, new_repost),
                query_runner.manager.increment(Tweet, { tweet_id }, 'num_reposts', 1),
            ]);
            await query_runner.commitTransaction();
        } catch (error) {
            console.error(error);
            await query_runner.rollbackTransaction();
            throw error;
        }
    }

    async getTweetsByUserId(user_id: string, page_offset: number = 1, page_size: number = 10) {
        const skip = (page_offset - 1) * page_size;

        const [tweets, total] = await this.tweet_repository.findAndCount({
            where: { user_id },
            relations: ['user'],
            order: { created_at: 'DESC' },
            skip,
            take: page_size,
        });

        return { data: tweets, count: total };
    }

    async getAllTweets(query_dto: GetTweetsQueryDto) {
        const { user_id, cursor, limit = 20 } = query_dto;

        const query_builder = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .orderBy('tweet.created_at', 'DESC')
            .addOrderBy('tweet.tweet_id', 'DESC')
            .take(limit);

        // Filter by user_id if provided
        if (user_id) {
            query_builder.andWhere('tweet.user_id = :user_id', { user_id });
        }

        // Cursor-based pagination using created_at timestamp
        if (cursor) {
            // Cursor should be in format: timestamp_tweetId (e.g., "2025-10-23T12:00:00.000Z_uuid")
            const [cursor_timestamp, cursor_id] = cursor.split('_');
            if (cursor_timestamp && cursor_id) {
                query_builder.andWhere(
                    '(tweet.created_at < :cursor_timestamp OR (tweet.created_at = :cursor_timestamp AND tweet.tweet_id < :cursor_id))',
                    { cursor_timestamp, cursor_id }
                );
            }
        }

        const tweets = await query_builder.getMany();
        const total = await query_builder.getCount();

        // Generate next_cursor from the last tweet
        const next_cursor =
            tweets.length > 0
                ? `${tweets[tweets.length - 1].created_at.toISOString()}_${tweets[tweets.length - 1].tweet_id}`
                : null;

        return {
            data: tweets,
            count: total,
            next_cursor,
            has_more: tweets.length === limit,
        };
    }

    async incrementTweetViews(tweet_id: string) {
        try {
            const tweet = await this.tweet_repository.findOne({
                where: { tweet_id },
            });

            if (!tweet) throw new NotFoundException('Tweet not found');

            await this.tweet_repository.increment({ tweet_id }, 'num_views', 1);

            return { success: true };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}
