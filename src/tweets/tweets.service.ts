import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
import { CreateTweetDTO, UpdateTweetDTO } from './dto';
import { GetTweetsQueryDto } from './dto/get-tweets-query.dto';
import { PostgresErrorCodes } from '../shared/enums/postgres-error-codes';
import { Tweet } from './entities/tweet.entity';
import { TweetLike } from './entities/tweet-like.entity';
import { TweetRepost } from './entities/tweet-repost.entity';
import { TweetQuote } from './entities/tweet-quote.entity';
import { TweetReply } from './entities/tweet-reply.entity';
import { Hashtag } from './entities/hashtags.entity';
import { User } from 'src/user/entities/user.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { BlobServiceClient } from '@azure/storage-blob';
import { GoogleGenAI } from '@google/genai';

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
        private data_source: DataSource,
        private readonly paginate_service: PaginationService
    ) {}

    private readonly TWEET_IMAGES_CONTAINER = 'post-images';
    private readonly TWEET_VIDEOS_CONTAINER = 'post-videos';

    private readonly API_KEY = process.env.GOOGLE_API_KEY ?? '';
    private readonly genAI = new GoogleGenAI({ apiKey: this.API_KEY });

    private readonly TOPICS = ['Sports', 'Entertainment', 'News'];

    /**
     * Handles image upload processing
     * @param file - The uploaded image file (in memory, not saved to disk)
     * @param _user_id - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    async uploadImage(file: Express.Multer.File, user_id: string) {
        const image_name = `${user_id}-${Date.now()}-${file.originalname}`;

        const url = await this.uploadImageToAzure(
            file.buffer,
            image_name,
            this.TWEET_IMAGES_CONTAINER
        );

        return {
            url,
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        };
    }

    private async uploadImageToAzure(
        image_buffer: Buffer,
        image_name: string,
        container_name: string
    ): Promise<string> {
        const connection_string = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if (!connection_string) {
            throw new Error(
                'AZURE_STORAGE_CONNECTION_STRING is not defined in environment variables'
            );
        }

        // Debug: Check if connection string has placeholder key
        if (connection_string.includes('YOUR_KEY_HERE')) {
            throw new Error(
                'Azure Storage AccountKey is still set to placeholder value. Please update with actual key.'
            );
        }

        console.log(
            'Azure Connection String (masked):',
            connection_string.replace(/AccountKey=[^;]+/, 'AccountKey=***')
        );

        const blob_service_client = BlobServiceClient.fromConnectionString(connection_string);

        const container_client = blob_service_client.getContainerClient(container_name);
        await container_client.createIfNotExists({ access: 'blob' });

        const block_blob_client = container_client.getBlockBlobClient(image_name);
        await block_blob_client.upload(image_buffer, image_buffer.length);

        return block_blob_client.url;
    }

    /**
     * Handles video upload processing
     * @param file - The uploaded video file (in memory, not saved to disk)
     * @param _user_id - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    async uploadVideo(
        file: Express.Multer.File,
        _user_id: string
    ): Promise<UploadMediaResponseDTO> {
        const video_name = `${Date.now()}-${file.originalname}`;

        const video_url = await this.uploadVideoToAzure(file.buffer, video_name);

        return {
            url: video_url,
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        };
    }

    private async uploadVideoToAzure(video_buffer: Buffer, video_name: string): Promise<string> {
        const container_name = this.TWEET_VIDEOS_CONTAINER;
        const connection_string = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if (!connection_string) {
            throw new Error(
                'AZURE_STORAGE_CONNECTION_STRING is not defined in environment variables'
            );
        }

        if (connection_string.includes('YOUR_KEY_HERE')) {
            throw new Error(
                'Azure Storage AccountKey is still set to placeholder value. Please update with actual key.'
            );
        }

        console.log(
            'Azure Connection String (masked):',
            connection_string.replace(/AccountKey=[^;]+/, 'AccountKey=***')
        );

        const blob_service_client = BlobServiceClient.fromConnectionString(connection_string);

        const container_client = blob_service_client.getContainerClient(container_name);
        await container_client.createIfNotExists({ access: 'blob' });

        const block_blob_client = container_client.getBlockBlobClient(video_name);

        await block_blob_client.upload(video_buffer, video_buffer.length, {
            blobHTTPHeaders: {
                blobContentType: 'video/mp4',
            },
        });

        return block_blob_client.url;
    }

    async createTweet(tweet: CreateTweetDTO, user_id: string): Promise<Tweet> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            await this.extractDataFromTweets(tweet, user_id, query_runner);
            const extracted_topics = this.extractTopics(tweet.content);
            const new_tweet = query_runner.manager.create(Tweet, {
                user_id,
                ...tweet,
            });
            const [saved_tweet, user] = await Promise.all([
                query_runner.manager.save(Tweet, new_tweet),
                query_runner.manager.findOne(User, { where: { id: user_id } }),
            ]);
            saved_tweet.user = user!;
            await query_runner.commitTransaction();
            return saved_tweet;
        } catch (error) {
            await query_runner.rollbackTransaction();
            console.error(error);
            throw error;
        }
    }

    async updateTweet(tweet: UpdateTweetDTO, tweet_id: string, user_id: string): Promise<Tweet> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            await this.extractDataFromTweets(tweet, user_id, query_runner);

            const [tweet_to_update, user] = await Promise.all([
                query_runner.manager.findOne(Tweet, { where: { tweet_id } }),
                query_runner.manager.findOne(User, { where: { id: user_id } }),
            ]);

            if (!tweet_to_update) throw new NotFoundException('Tweet not found');

            query_runner.manager.merge(Tweet, tweet_to_update, { ...tweet });

            if (tweet_to_update.user_id !== user_id)
                throw new BadRequestException('User is not allowed to update this tweet');

            const updated_tweet = await query_runner.manager.save(Tweet, tweet_to_update);
            updated_tweet.user = user!;

            await query_runner.commitTransaction();
            return updated_tweet;
        } catch (error) {
            await query_runner.rollbackTransaction();
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
                query_runner.manager.increment(Tweet, { tweet_id }, 'num_quotes', 1),
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
            where: { user: { id: user_id } },
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

    /***************************************Helper Methods***************************************/
    private async extractDataFromTweets(
        tweet: CreateTweetDTO | UpdateTweetDTO,
        user_id: string,
        query_runner: QueryRunner
    ) {
        const { content } = tweet;
        if (!content) return;
        console.log('content:', content);

        // Extract mentions
        const mentions = content.match(/@([a-zA-Z0-9_]+)/g) || [];
        this.mentionNotification(mentions, user_id);

        // Extract hashtags
        const hashtags =
            content.match(/#([a-zA-Z0-9_]+)/g)?.map((hashtag) => hashtag.slice(1)) || [];
        await this.updateHashtags(hashtags, user_id, query_runner);

        // Extract topics using Gemini AI
        const topics = await this.extractTopics(content);
        console.log('Extracted topics:', topics);

        // You can store topics in the tweet entity or use them for recommendations
        // For example, you could add a 'topics' field to your Tweet entity
        // tweet.topics = topics;
    }

    async extractTopics(content: string): Promise<Record<string, number>> {
        try {
            const prompt = `Analyze the following text and categorize it into these topics: ${this.TOPICS.join(', ')}.
                Return ONLY a JSON object with topic names as keys and percentage values (0-100) as numbers. The percentages should add up to 100.
                Only include topics that are relevant (percentage > 0).

                Example format:
                { "Sports": 60, "Entertainment": 30, "News": 10 }

                Text to analyze:
                "${content}"

                Return only the JSON object, no additional text or explanation.
            `;

            const response = await this.genAI.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: prompt,
            });

            if (!response.text) {
                console.warn('Gemini returned empty response');
                const empty_response: Record<string, number> = {};
                this.TOPICS.forEach((topic) => (empty_response[topic] = 0));
                return empty_response;
            }

            const response_text = response.text.trim();
            console.log('Gemini response:', response_text);

            let json_text = response_text;
            const json_match = response_text.match(/\{[^}]+\}/);
            if (json_match) json_text = json_match[0];

            const topic_percentages = JSON.parse(json_text);

            const total = Object.values(topic_percentages).reduce(
                (sum: number, val: any) => sum + Number(val),
                0
            ) as number;
            if (Math.abs(total - 100) > 1) {
                console.warn('Topic percentages do not sum to 100, normalizing...');

                Object.keys(topic_percentages).forEach((key) => {
                    topic_percentages[key] = Math.round((topic_percentages[key] / total) * 100);
                });
            }

            return topic_percentages;
        } catch (error) {
            console.error('Error extracting topics with Gemini:', error);
            throw error;
        }
    }

    private mentionNotification(ids: string[], user_id: string): void {}

    private async updateHashtags(
        names: string[],
        user_id: string,
        query_runner: QueryRunner
    ): Promise<void> {
        try {
            const hashtags = names.map(
                (name) => ({ name, created_by: { id: user_id } }) as Hashtag
            );
            await query_runner.manager.upsert(Hashtag, hashtags, {
                conflictPaths: ['name'],
                upsertType: 'on-conflict-do-update',
            });
            await query_runner.manager.increment(Hashtag, { name: In(names) }, 'usage_count', 1);
        } catch (error) {
            await query_runner.rollbackTransaction();
            console.error(error);
            throw error;
        }
    }
}
