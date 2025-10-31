import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
import { Tweet, TweetLike, TweetQuote, TweetReply, TweetRepost } from './entities';
import { CreateTweetDTO, UpdateTweetDTO } from './dto';
import { PostgresErrorCodes } from './enums/postgres-error-codes';
import { DataSource } from 'typeorm';

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
     * @param user_id - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    async uploadImage(file: Express.Multer.File, user_id: string): Promise<UploadMediaResponseDTO> {
        // TODO: Implement image upload logic
        // - Upload to cloud storage (S3, Cloudinary, etc.)
        // - Save file metadata to database
        // - Process/compress image if needed
        // - Generate thumbnail
        // - Return file URL and metadata

        // File is in memory as file.buffer
        // NOT saved to disk - discarded after request
        return {
            url: `https://your-cdn.com/placeholder-url`, // Placeholder URL
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        };
    }

    /**
     * Handles video upload processing
     * @param file - The uploaded video file (in memory, not saved to disk)
     * @param user_id - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    async uploadVideo(file: Express.Multer.File, user_id: string): Promise<UploadMediaResponseDTO> {
        // TODO: Implement video upload logic
        // - Upload to cloud storage (S3, Cloudinary, etc.)
        // - Save file metadata to database
        // - Transcode video if needed
        // - Generate thumbnail/preview
        // - Return file URL and metadata

        // File is in memory as file.buffer
        // NOT saved to disk - discarded after request
        return {
            url: `https://your-cdn.com/placeholder-url`, // Placeholder URL
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        };
    }

    async createTweet(tweet: CreateTweetDTO, user_id: string): Promise<Tweet> {
        try {
            const new_tweet = this.tweet_repository.create({
                user_id,
                ...tweet,
            });
            await this.tweet_repository.save(new_tweet);
            return new_tweet;
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
            return updated_tweet;
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
            const tweet = await this.tweet_repository.findOne({ where: { tweet_id } });
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
                tweet_id,
                user_id,
            });
            await query_runner.manager.save(TweetLike, new_like);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_likes', 1);
        } catch (error) {
            await query_runner.rollbackTransaction();
            if (error.code === PostgresErrorCodes.FOREIGN_KEY_VIOLATION)
                throw new NotFoundException('Tweet not found');
            console.error(error);
            throw error;
        }
    }

    async unLikeTweet(tweet_id: string, user_id: string) {
        try {
            const affected_entities = await this.tweet_like_repository.delete({
                tweet_id,
                user_id,
            });
            if (affected_entities.affected === 0)
                throw new NotFoundException('User seemed to not like this tweet');
        } catch (error) {
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
                original_tweet_id: tweet_id,
                user_id,
            });
            await Promise.all([
                query_runner.manager.save(TweetRepost, new_repost),
                query_runner.manager.increment(Tweet, { tweet_id }, 'num_reposts', 1),
            ]);
        } catch (error) {
            console.error(error);
            await query_runner.rollbackTransaction();
            throw error;
        }
    }
}
