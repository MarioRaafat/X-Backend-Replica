/* eslint-disable */
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository, SelectQueryBuilder } from 'typeorm';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
import { CreateTweetDTO, UpdateTweetDTO } from './dto';
import { GetTweetsQueryDto } from './dto/get-tweets-query.dto';
import { TweetResponseDTO } from './dto/tweet-response.dto';
import { PostgresErrorCodes } from '../shared/enums/postgres-error-codes';
import { Tweet } from './entities/tweet.entity';
import { TweetLike } from './entities/tweet-like.entity';
import { TweetRepost } from './entities/tweet-repost.entity';
import { TweetQuote } from './entities/tweet-quote.entity';
import { TweetReply } from './entities/tweet-reply.entity';
import { Hashtag } from './entities/hashtags.entity';
import { UserFollows } from '../user/entities/user-follows.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { BlobServiceClient } from '@azure/storage-blob';
import { GoogleGenAI } from '@google/genai';
import { TweetMapper } from './mappers/tweet.mapper';

interface ITweetWithTypeInfo extends Tweet {
    reply_info_original_tweet_id?: string;
    quote_info_original_tweet_id?: string;
    repost_info_original_tweet_id?: string;
}

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
        @InjectRepository(UserFollows)
        private readonly user_follows_repository: Repository<UserFollows>,
        private data_source: DataSource,
        private readonly paginate_service: PaginationService
    ) {}

    private readonly TWEET_IMAGES_CONTAINER = 'post-images';
    private readonly TWEET_VIDEOS_CONTAINER = 'post-videos';

    private readonly API_KEY = process.env.GOOGLE_API_KEY ?? '';
    private readonly genAI = new GoogleGenAI({ apiKey: this.API_KEY });

    private readonly TOPICS = ['Sports', 'Entertainment', 'News'];

    /**
     * Helper method to attach type information from raw query results to tweet entities
     */
    private attachTypeInfo(tweet: Tweet, raw: Record<string, unknown>): ITweetWithTypeInfo {
        const tweet_with_type = tweet as ITweetWithTypeInfo;

        // TypeORM raw results can have different key formats
        // Check: alias name, dotted path, and original column name
        tweet_with_type.reply_info_original_tweet_id =
            (raw.reply_info_original_tweet_id as string | undefined) ||
            (raw['reply_info.original_tweet_id'] as string | undefined) ||
            (raw['reply_info_original_tweet_id'] as string | undefined) ||
            undefined;

        tweet_with_type.quote_info_original_tweet_id =
            (raw.quote_info_original_tweet_id as string | undefined) ||
            (raw['quote_info.original_tweet_id'] as string | undefined) ||
            (raw['quote_info_original_tweet_id'] as string | undefined) ||
            undefined;

        tweet_with_type.repost_info_original_tweet_id =
            (raw.repost_info_tweet_id as string | undefined) ||
            (raw['repost_info.tweet_id'] as string | undefined) ||
            (raw['repost_info_tweet_id'] as string | undefined) ||
            undefined;

        return tweet_with_type;
    }

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
        try {
            const video_name = `${Date.now()}-${file.originalname}`;

            const video_url = await this.uploadVideoToAzure(file.buffer, video_name);

            return {
                url: video_url,
                filename: file.originalname,
                size: file.size,
                mime_type: file.mimetype,
            };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    private async uploadVideoToAzure(video_buffer: Buffer, video_name: string): Promise<string> {
        try {
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
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async createTweet(tweet: CreateTweetDTO, user_id: string): Promise<TweetResponseDTO> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            await this.extractDataFromTweets(tweet, user_id, query_runner);
            // const extracted_topics = this.extractTopics(tweet.content);
            const new_tweet = query_runner.manager.create(Tweet, {
                user_id,
                ...tweet,
            });
            const saved_tweet = await query_runner.manager.save(Tweet, new_tweet);
            await query_runner.commitTransaction();

            // Fetch the complete tweet with only required user fields
            const query = this.tweet_repository
                .createQueryBuilder('tweet')
                .leftJoinAndSelect('tweet.user', 'user')
                .where('tweet.tweet_id = :tweet_id', { tweet_id: saved_tweet.tweet_id });

            const result_data = await this.selectTweetFields(query).getRawAndEntities();

            if (!result_data.entities[0]) throw new NotFoundException('Tweet not found');

            // Attach type info from raw data
            const tweet_with_type_info = this.attachTypeInfo(
                result_data.entities[0],
                result_data.raw[0] as Record<string, unknown>
            );

            return TweetMapper.toDTO(tweet_with_type_info);
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async updateTweet(
        tweet: UpdateTweetDTO,
        tweet_id: string,
        user_id: string
    ): Promise<TweetResponseDTO> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            await this.extractDataFromTweets(tweet, user_id, query_runner);

            const tweet_to_update = await query_runner.manager.findOne(Tweet, {
                where: { tweet_id },
            });

            if (!tweet_to_update) throw new NotFoundException('Tweet not found');

            query_runner.manager.merge(Tweet, tweet_to_update, { ...tweet });

            if (tweet_to_update.user_id !== user_id)
                throw new BadRequestException('User is not allowed to update this tweet');

            await query_runner.manager.save(Tweet, tweet_to_update);

            await query_runner.commitTransaction();

            // Fetch the updated tweet with only required fields
            const query = this.tweet_repository
                .createQueryBuilder('tweet')
                .leftJoinAndSelect('tweet.user', 'user')
                .where('tweet.tweet_id = :tweet_id', { tweet_id });

            const result_data = await this.selectTweetFields(query).getRawAndEntities();

            if (!result_data.entities[0]) throw new NotFoundException('Tweet not found');

            // Attach type info from raw data
            const tweet_with_type_info = this.attachTypeInfo(
                result_data.entities[0],
                result_data.raw[0] as Record<string, unknown>
            );

            return TweetMapper.toDTO(tweet_with_type_info);
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    // In case of soft delete, the tweet linked features such as likes, reposts, replies won't be deleted automatically,
    // which delete would we use?
    async deleteTweet(tweet_id: string, user_id: string): Promise<void> {
        // First check if tweet exists and user owns it
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
            select: ['tweet_id', 'user_id'],
        });

        if (!tweet) throw new NotFoundException('Tweet not found');

        if (tweet.user_id !== user_id) {
            throw new BadRequestException('User is not allowed to delete this tweet');
        }

        await this.tweet_repository.delete({ tweet_id });
    }

    async getTweetById(tweet_id: string, current_user_id?: string): Promise<TweetResponseDTO> {
        const query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .where('tweet.tweet_id = :tweet_id', { tweet_id });

        this.selectTweetFields(query, !!current_user_id, current_user_id);

        const result_data = await query.getRawAndEntities();

        if (!result_data.entities[0]) throw new NotFoundException('Tweet Not Found');

        // Attach type info from raw data
        const tweet_with_type_info = this.attachTypeInfo(
            result_data.entities[0],
            result_data.raw[0] as Record<string, unknown>
        );

        return TweetMapper.toDTO(tweet_with_type_info, current_user_id);
    }

    async likeTweet(tweet_id: string, user_id: string): Promise<void> {
        // Check if tweet exists before starting transaction
        const tweet_exists = await this.tweet_repository.exist({ where: { tweet_id } });
        if (!tweet_exists) throw new NotFoundException('Tweet not found');

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
            const error_code = (error as { code?: string }).code;
            if (error_code === PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION)
                throw new BadRequestException('User already liked this tweet');
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async unlikeTweet(tweet_id: string, user_id: string): Promise<void> {
        // Check if tweet exists before starting transaction
        const tweet_exists = await this.tweet_repository.exist({ where: { tweet_id } });
        if (!tweet_exists) throw new NotFoundException('Tweet not found');

        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const delete_result = await query_runner.manager.delete(TweetLike, {
                tweet: { tweet_id },
                user: { id: user_id },
            });

            if (delete_result.affected === 0) {
                throw new BadRequestException('User has not liked this tweet');
            }

            await query_runner.manager.decrement(Tweet, { tweet_id }, 'num_likes', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async repostTweetWithQuote(
        tweet_id: string,
        user_id: string,
        quote: CreateTweetDTO
    ): Promise<TweetResponseDTO> {
        // Check if original tweet exists before starting transaction
        const tweet_exists = await this.tweet_repository.exist({ where: { tweet_id } });
        if (!tweet_exists) throw new NotFoundException('Original tweet not found');

        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            await this.extractDataFromTweets(quote, user_id, query_runner);

            const new_quote_tweet = query_runner.manager.create(Tweet, {
                ...quote,
                user_id,
            });
            const saved_quote_tweet = await query_runner.manager.save(Tweet, new_quote_tweet);

            const tweet_quote = query_runner.manager.create(TweetQuote, {
                original_tweet_id: tweet_id,
                quote_tweet_id: saved_quote_tweet.tweet_id,
                user_id,
            });

            await query_runner.manager.save(TweetQuote, tweet_quote);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_quotes', 1);
            await query_runner.commitTransaction();

            // Fetch the complete quote tweet
            const query = this.tweet_repository
                .createQueryBuilder('tweet')
                .leftJoinAndSelect('tweet.user', 'user')
                .where('tweet.tweet_id = :tweet_id', { tweet_id: saved_quote_tweet.tweet_id });

            const result_data = await this.selectTweetFields(query).getRawAndEntities();

            if (!result_data.entities[0]) throw new NotFoundException('Quote tweet not found');

            // Attach type info from raw data
            const tweet_with_type_info = this.attachTypeInfo(
                result_data.entities[0],
                result_data.raw[0] as Record<string, unknown>
            );

            return TweetMapper.toDTO(tweet_with_type_info);
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async repostTweet(tweet_id: string, user_id: string): Promise<void> {
        // Check if tweet exists before starting transaction
        const tweet_exists = await this.tweet_repository.exist({ where: { tweet_id } });
        if (!tweet_exists) throw new NotFoundException('Tweet not found');

        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const new_repost = query_runner.manager.create(TweetRepost, {
                tweet_id,
                user_id,
            });
            await query_runner.manager.save(TweetRepost, new_repost);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_reposts', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            const error_code = (error as { code?: string }).code;
            if (error_code === PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION) {
                throw new BadRequestException('User already reposted this tweet');
            }
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async deleteRepost(repost_id: string, user_id: string): Promise<void> {
        // Find the repost and verify ownership
        const repost = await this.tweet_repost_repository.findOne({
            where: { id: repost_id },
            relations: ['tweet'],
        });

        if (!repost) {
            throw new NotFoundException('Repost not found');
        }

        if (repost.user_id !== user_id) {
            throw new ForbiddenException('You can only delete your own reposts');
        }

        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            // Delete the repost
            await query_runner.manager.delete(TweetRepost, { id: repost_id });

            // Decrement the repost count
            await query_runner.manager.decrement(
                Tweet,
                { tweet_id: repost.tweet_id },
                'num_reposts',
                1
            );

            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async replyToTweet(
        original_tweet_id: string,
        user_id: string,
        reply_dto: CreateTweetDTO
    ): Promise<TweetResponseDTO> {
        // Check if original tweet exists before starting transaction
        const original_tweet = await this.tweet_repository.findOne({
            where: { tweet_id: original_tweet_id },
            select: ['tweet_id', 'conversation_id'],
        });
        if (!original_tweet) throw new NotFoundException('Original tweet not found');

        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            await this.extractDataFromTweets(reply_dto, user_id, query_runner);

            // Create the reply tweet
            const new_reply_tweet = query_runner.manager.create(Tweet, {
                ...reply_dto,
                user_id,
                // Set conversation_id: if original tweet has one, use it; otherwise use original tweet's ID
                conversation_id: original_tweet.conversation_id || original_tweet_id,
            });
            const saved_reply_tweet = await query_runner.manager.save(Tweet, new_reply_tweet);

            // Create the reply relationship
            const tweet_reply = query_runner.manager.create(TweetReply, {
                reply_tweet_id: saved_reply_tweet.tweet_id,
                original_tweet_id,
                user_id,
            });
            await query_runner.manager.save(TweetReply, tweet_reply);

            // Increment reply count on original tweet
            await query_runner.manager.increment(
                Tweet,
                { tweet_id: original_tweet_id },
                'num_replies',
                1
            );

            await query_runner.commitTransaction();

            // Fetch the complete reply tweet
            const query = this.tweet_repository
                .createQueryBuilder('tweet')
                .leftJoinAndSelect('tweet.user', 'user')
                .where('tweet.tweet_id = :tweet_id', { tweet_id: saved_reply_tweet.tweet_id });

            const result_data = await this.selectTweetFields(query).getRawAndEntities();

            if (!result_data.entities[0]) throw new NotFoundException('Reply tweet not found');

            // Attach type info from raw data
            const tweet_with_type_info = this.attachTypeInfo(
                result_data.entities[0],
                result_data.raw[0] as Record<string, unknown>
            );

            return TweetMapper.toDTO(tweet_with_type_info);
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async getTweetsByUserId(
        user_id: string,
        page_offset: number = 1,
        page_size: number = 10
    ): Promise<{ data: TweetResponseDTO[]; count: number }> {
        const skip = (page_offset - 1) * page_size;

        const query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .where('tweet.user_id = :user_id', { user_id })
            .orderBy('tweet.created_at', 'DESC')
            .skip(skip)
            .take(page_size);

        this.selectTweetFields(query);

        const result_data = await query.getRawAndEntities();

        // Attach type info from raw data to each tweet
        const tweets_with_type_info: ITweetWithTypeInfo[] = result_data.entities.map(
            (tweet, index) =>
                this.attachTypeInfo(tweet, result_data.raw[index] as Record<string, unknown>)
        );

        // Get count
        const total = await query.getCount();

        return {
            data: TweetMapper.toDTOList(tweets_with_type_info),
            count: total,
        };
    }

    async getAllTweets(
        query_dto: GetTweetsQueryDto,
        current_user_id?: string
    ): Promise<{
        data: TweetResponseDTO[];
        count: number;
        next_cursor: string | null;
        has_more: boolean;
    }> {
        const { user_id, cursor, limit = 20 } = query_dto;

        // Get original tweets
        const tweets_query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .orderBy('tweet.created_at', 'DESC')
            .addOrderBy('tweet.tweet_id', 'DESC')
            .take(limit * 2); // Fetch more to account for reposts

        // Filter by user_id if provided (get tweets BY this user)
        if (user_id) {
            tweets_query.andWhere('tweet.user_id = :user_id', { user_id });
        }

        // Apply field selection, type detection joins, and user interaction joins
        this.selectTweetFields(tweets_query, !!current_user_id, current_user_id);

        // Get ALL reposts (or filter by user_id if provided)
        const reposts_query = this.tweet_repost_repository
            .createQueryBuilder('repost')
            .leftJoinAndSelect('repost.tweet', 'tweet')
            .leftJoinAndSelect('tweet.user', 'tweet_user')
            .leftJoinAndSelect('repost.user', 'reposter')
            .orderBy('repost.created_at', 'DESC')
            .addOrderBy('repost.id', 'DESC')
            .take(limit * 2); // Fetch more to account for original tweets

        // If filtering by user_id, only get reposts BY this user
        if (user_id) {
            reposts_query.andWhere('repost.user_id = :user_id', { user_id });
        }

        // Add joins for user interactions on reposted tweets
        if (current_user_id) {
            reposts_query
                .leftJoin('tweet.likes', 'tweet_likes', 'tweet_likes.user_id = :current_user_id', {
                    current_user_id,
                })
                .leftJoin(
                    'tweet.reposts',
                    'tweet_reposts',
                    'tweet_reposts.user_id = :current_user_id',
                    {
                        current_user_id,
                    }
                );
        }

        // Add joins for tweet type detection
        reposts_query
            .leftJoin('TweetReply', 'reply_info', 'reply_info.reply_tweet_id = tweet.tweet_id')
            .leftJoin('TweetQuote', 'quote_info', 'quote_info.quote_tweet_id = tweet.tweet_id')
            .addSelect('reply_info.original_tweet_id', 'reply_info_original_tweet_id')
            .addSelect('quote_info.original_tweet_id', 'quote_info_original_tweet_id');

        // Execute both queries
        const [tweets_result, reposts_result] = await Promise.all([
            tweets_query.getRawAndEntities(),
            reposts_query.getRawAndEntities(),
        ]);

        // Attach type info from raw data to each original tweet
        const tweets_with_type_info: ITweetWithTypeInfo[] = tweets_result.entities.map(
            (tweet, index) =>
                this.attachTypeInfo(tweet, tweets_result.raw[index] as Record<string, unknown>)
        );

        // Process reposts with their repost timestamp and reposter info
        const reposts_data = reposts_result.entities.map((repost, index) => ({
            tweet: this.attachTypeInfo(
                repost.tweet,
                reposts_result.raw[index] as Record<string, unknown>
            ),
            reposter_user: repost.user,
            repost_created_at: repost.created_at, // Use REPOST timestamp for sorting
            repost_id: repost.id,
        }));

        // Combine tweets and reposts with their respective timestamps
        const all_items = [
            ...tweets_with_type_info.map((tweet) => ({
                tweet,
                reposter_user: null as any,
                repost_id: null,
                repost_created_at: null,
                sort_date: tweet.created_at, // Original tweet uses tweet.created_at
                sort_id: `tweet_${tweet.tweet_id}`, // Prefix to distinguish from reposts
            })),
            ...reposts_data.map((repost) => ({
                tweet: repost.tweet,
                reposter_user: repost.reposter_user,
                repost_id: repost.repost_id,
                repost_created_at: repost.repost_created_at,
                sort_date: repost.repost_created_at, // Repost uses repost.created_at
                sort_id: `repost_${repost.repost_id}`, // Prefix to distinguish from tweets
            })),
        ]
            .sort((a, b) => {
                // Sort by date descending (newest first)
                const date_diff = b.sort_date.getTime() - a.sort_date.getTime();
                if (date_diff !== 0) return date_diff;
                // If same date, sort by ID
                return b.sort_id.localeCompare(a.sort_id);
            })
            .slice(0, limit); // Take only the limit after combining

        // Apply cursor pagination if provided
        let filtered_items = all_items;
        if (cursor) {
            const [cursor_timestamp, cursor_id] = cursor.split('_');
            if (cursor_timestamp && cursor_id) {
                const cursor_date = new Date(cursor_timestamp);
                filtered_items = all_items
                    .filter((item) => {
                        if (item.sort_date < cursor_date) return true;
                        if (
                            item.sort_date.getTime() === cursor_date.getTime() &&
                            item.sort_id < cursor_id
                        )
                            return true;
                        return false;
                    })
                    .slice(0, limit);
            }
        }

        // Map to DTOs and attach reposter info
        const result_tweets = filtered_items.map((item) => {
            const dto = TweetMapper.toDTO(item.tweet, current_user_id);
            if (item.reposter_user && item.repost_id) {
                dto.reposted_by = {
                    repost_id: item.repost_id,
                    id: item.reposter_user.id,
                    name: item.reposter_user.name,
                    reposted_at: item.repost_created_at,
                };
            }
            return dto;
        });

        // Generate next_cursor from the last item
        const next_cursor =
            filtered_items.length > 0
                ? `${filtered_items[filtered_items.length - 1].sort_date.toISOString()}_${filtered_items[filtered_items.length - 1].sort_id}`
                : null;

        const total_count = tweets_with_type_info.length + reposts_data.length;

        return {
            data: result_tweets,
            count: total_count,
            next_cursor,
            has_more: filtered_items.length === limit,
        };
    }

    async incrementTweetViews(tweet_id: string): Promise<{ success: boolean }> {
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
        });

        if (!tweet) throw new NotFoundException('Tweet not found');

        await this.tweet_repository.increment({ tweet_id }, 'num_views', 1);

        return { success: true };
    }

    async getTweetLikes(
        tweet_id: string,
        current_user_id: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{
        data: {
            id: string;
            username: string;
            name: string;
            avatar_url: string;
            verified: boolean;
            is_followed: boolean;
            is_following: boolean;
        }[];
        pagination: {
            total_items: number;
            total_pages: number;
            current_page: number;
            items_per_page: number;
            has_next_page: boolean;
            has_previous_page: boolean;
        };
    }> {
        // Check if tweet exists and get the owner
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
            select: ['tweet_id', 'num_likes', 'user_id'],
        });

        if (!tweet) throw new NotFoundException('Tweet not found');

        // Only the tweet owner can see who liked their tweet
        if (tweet.user_id !== current_user_id) {
            throw new BadRequestException('Only the tweet owner can see who liked their tweet');
        }

        // Build query for tweet likes with user information and follow relationships
        const query_builder = this.tweet_like_repository
            .createQueryBuilder('like')
            .leftJoinAndSelect('like.user', 'user')
            .leftJoin(
                'user_follows',
                'current_user_follows',
                'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
                { current_user_id }
            )
            .leftJoin(
                'user_follows',
                'user_follows_current',
                'user_follows_current.follower_id = user.id AND user_follows_current.followed_id = :current_user_id',
                { current_user_id }
            )
            .addSelect('current_user_follows.followed_id', 'is_followed')
            .addSelect('user_follows_current.follower_id', 'is_following')
            .where('like.tweet_id = :tweet_id', { tweet_id });

        // Use pagination service (sort by user_id since created_at doesn't exist)
        const paginated_result = await this.paginate_service.paginate(
            query_builder,
            { page, limit, sort_by: 'user_id', sort_order: 'DESC' },
            'like',
            ['user_id', 'tweet_id']
        );

        // Map to user response format with follow information from the query
        const users = paginated_result.data.map((like: any) => ({
            id: like.user.id,
            username: like.user.username,
            name: like.user.name,
            avatar_url: like.user.avatar_url || '',
            verified: like.user.verified,
            is_followed: !!like.is_followed,
            is_following: !!like.is_following,
        }));

        return {
            data: users,
            pagination: paginated_result.pagination,
        };
    }

    async getTweetReposts(
        tweet_id: string,
        current_user_id: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{
        data: {
            id: string;
            username: string;
            name: string;
            avatar_url: string;
            verified: boolean;
            is_followed: boolean;
            is_following: boolean;
        }[];
        pagination: {
            total_items: number;
            total_pages: number;
            current_page: number;
            items_per_page: number;
            has_next_page: boolean;
            has_previous_page: boolean;
        };
    }> {
        // Check if tweet exists and get the owner
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
            select: ['tweet_id', 'num_reposts', 'user_id'],
        });

        if (!tweet) throw new NotFoundException('Tweet not found');

        // Only the tweet owner can see who reposted their tweet
        if (tweet.user_id !== current_user_id) {
            throw new BadRequestException('Only the tweet owner can see who reposted their tweet');
        }

        // Build query for tweet reposts with user information and follow relationships
        const query_builder = this.tweet_repost_repository
            .createQueryBuilder('repost')
            .leftJoinAndSelect('repost.user', 'user')
            .leftJoin(
                'user_follows',
                'current_user_follows',
                'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
                { current_user_id }
            )
            .leftJoin(
                'user_follows',
                'user_follows_current',
                'user_follows_current.follower_id = user.id AND user_follows_current.followed_id = :current_user_id',
                { current_user_id }
            )
            .addSelect('current_user_follows.followed_id', 'is_followed')
            .addSelect('user_follows_current.follower_id', 'is_following')
            .where('repost.tweet_id = :tweet_id', { tweet_id });

        // Use pagination service (sort by created_at descending)
        const paginated_result = await this.paginate_service.paginate(
            query_builder,
            { page, limit, sort_by: 'created_at', sort_order: 'DESC' },
            'repost',
            ['created_at', 'id']
        );

        // Map to user response format with follow information from the query
        const users = paginated_result.data.map((repost: any) => ({
            id: repost.user.id,
            username: repost.user.username,
            name: repost.user.name,
            avatar_url: repost.user.avatar_url || '',
            verified: repost.user.verified,
            is_followed: !!repost.is_followed,
            is_following: !!repost.is_following,
        }));

        return {
            data: users,
            pagination: paginated_result.pagination,
        };
    }

    /***************************************Helper Methods***************************************/

    private selectTweetFields(
        query: SelectQueryBuilder<Tweet>,
        include_user_interaction: boolean = false,
        current_user_id?: string
    ): SelectQueryBuilder<Tweet> {
        query.select([
            'tweet.tweet_id',
            'tweet.conversation_id',
            'tweet.content',
            'tweet.images',
            'tweet.videos',
            'tweet.num_likes',
            'tweet.num_reposts',
            'tweet.num_views',
            'tweet.num_quotes',
            'tweet.num_replies',
            'tweet.created_at',
            'tweet.updated_at',
            'user.id',
            'user.username',
            'user.name',
            'user.avatar_url',
            'user.verified',
        ]);

        // Join tables to determine tweet type and select the original_tweet_id
        query
            .leftJoin('TweetReply', 'reply_info', 'reply_info.reply_tweet_id = tweet.tweet_id')
            .leftJoin('TweetQuote', 'quote_info', 'quote_info.quote_tweet_id = tweet.tweet_id')
            .leftJoin(
                'TweetRepost',
                'repost_info',
                'repost_info.tweet_id = tweet.tweet_id AND repost_info.user_id = tweet.user_id'
            )
            .addSelect([
                'reply_info.original_tweet_id',
                'quote_info.original_tweet_id',
                'repost_info.tweet_id',
            ]);

        if (include_user_interaction && current_user_id) {
            query
                .leftJoin('tweet.likes', 'likes', 'likes.user_id = :current_user_id', {
                    current_user_id,
                })
                .leftJoin('tweet.reposts', 'reposts', 'reposts.user_id = :current_user_id', {
                    current_user_id,
                })
                .addSelect(['likes.user_id', 'reposts.user_id']);
        }

        return query;
    }

    private async extractDataFromTweets(
        tweet: CreateTweetDTO | UpdateTweetDTO,
        user_id: string,
        query_runner: QueryRunner
    ): Promise<void> {
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

    private mentionNotification(_ids: string[], _user_id: string): void {
        // TODO: Implement mention notification
    }

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
            throw error;
        }
    }
}
