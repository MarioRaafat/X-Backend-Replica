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
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { BlobServiceClient } from '@azure/storage-blob';
import { GoogleGenAI } from '@google/genai';
import { TweetMapper } from './mappers/tweet.mapper';

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

            // Fetch the complete tweet
            const created_tweet = await this.tweet_repository.findOne({
                where: { tweet_id: saved_tweet.tweet_id },
                relations: ['user'],
            });

            if (!created_tweet) throw new NotFoundException('Tweet not found');

            // Load type information
            await this.loadTweetTypeInfo(created_tweet);

            return TweetMapper.toDTO(created_tweet);
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

            // Fetch the updated tweet
            const updated_tweet = await this.tweet_repository.findOne({
                where: { tweet_id },
                relations: ['user'],
            });

            if (!updated_tweet) throw new NotFoundException('Tweet not found');

            // Load type information
            await this.loadTweetTypeInfo(updated_tweet);

            return TweetMapper.toDTO(updated_tweet);
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
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
            relations: ['user', 'likes', 'reposts'],
        });

        if (!tweet) throw new NotFoundException('Tweet Not Found');

        // Load type information before mapping
        await this.loadTweetTypeInfo(tweet);

        return TweetMapper.toDTO(tweet, current_user_id);
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
            // await this.extractDataFromTweets(quote, user_id, query_runner);

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
            const quote_tweet = await this.tweet_repository.findOne({
                where: { tweet_id: saved_quote_tweet.tweet_id },
                relations: ['user'],
            });

            if (!quote_tweet) throw new NotFoundException('Quote tweet not found');

            // Load type information before mapping
            await this.loadTweetTypeInfo(quote_tweet);

            return TweetMapper.toDTO(quote_tweet);
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

    async deleteRepost(tweet_id: string, user_id: string): Promise<void> {
        // Find the repost by user_id and tweet_id
        const repost = await this.tweet_repost_repository.findOne({
            where: {
                user_id,
                tweet_id,
            },
        });

        if (!repost) {
            throw new NotFoundException('Repost not found');
        }

        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            // Delete the repost
            await query_runner.manager.delete(TweetRepost, {
                user_id,
                tweet_id,
            });

            // Decrement the repost count
            await query_runner.manager.decrement(Tweet, { tweet_id }, 'num_reposts', 1);

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
            // await this.extractDataFromTweets(reply_dto, user_id, query_runner);

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
            const reply_tweet = await this.tweet_repository.findOne({
                where: { tweet_id: saved_reply_tweet.tweet_id },
                relations: ['user'],
            });

            if (!reply_tweet) throw new NotFoundException('Reply tweet not found');

            // Load type information before mapping
            await this.loadTweetTypeInfo(reply_tweet);

            return TweetMapper.toDTO(reply_tweet);
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

        const [tweets, total] = await this.tweet_repository.findAndCount({
            where: { user_id },
            relations: ['user', 'likes', 'reposts'],
            order: { created_at: 'DESC' },
            skip,
            take: page_size,
        });

        // Load type information for all tweets
        await Promise.all(tweets.map((tweet) => this.loadTweetTypeInfo(tweet)));

        return {
            data: TweetMapper.toDTOList(tweets),
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

        // Build query for original tweets
        const tweets_query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .leftJoinAndSelect('tweet.likes', 'likes')
            .leftJoinAndSelect('tweet.reposts', 'reposts')
            .orderBy('tweet.created_at', 'DESC')
            .addOrderBy('tweet.tweet_id', 'DESC')
            .take(limit * 2);

        if (user_id) {
            tweets_query.andWhere('tweet.user_id = :user_id', { user_id });
        }

        // Get reposts query
        const reposts_query = this.tweet_repost_repository
            .createQueryBuilder('repost')
            .leftJoinAndSelect('repost.tweet', 'tweet')
            .leftJoinAndSelect('tweet.user', 'tweet_user')
            .leftJoinAndSelect('tweet.likes', 'likes')
            .leftJoinAndSelect('tweet.reposts', 'reposts')
            .leftJoinAndSelect('repost.user', 'reposter')
            .orderBy('repost.created_at', 'DESC')
            .addOrderBy('repost.id', 'DESC')
            .take(limit * 2);

        if (user_id) {
            reposts_query.andWhere('repost.user_id = :user_id', { user_id });
        }

        // Execute both queries
        const [tweets, reposts] = await Promise.all([
            tweets_query.getMany(),
            reposts_query.getMany(),
        ]);

        // Load type information for all tweets
        const all_tweet_entities = [...tweets, ...reposts.map((repost) => repost.tweet)];
        await Promise.all(all_tweet_entities.map((tweet) => this.loadTweetTypeInfo(tweet)));

        // Combine tweets and reposts
        const all_items = [
            ...tweets.map((tweet) => ({
                tweet,
                reposter_user: null as any,
                repost_id: null,
                repost_created_at: null,
                sort_date: tweet.created_at,
                sort_id: `tweet_${tweet.tweet_id}`,
            })),
            ...reposts.map((repost) => ({
                tweet: repost.tweet,
                reposter_user: repost.user,
                repost_id: repost.id,
                repost_created_at: repost.created_at,
                sort_date: repost.created_at,
                sort_id: `repost_${repost.id}`,
            })),
        ]
            .sort((a, b) => {
                const date_diff = b.sort_date.getTime() - a.sort_date.getTime();
                if (date_diff !== 0) return date_diff;
                return b.sort_id.localeCompare(a.sort_id);
            })
            .slice(0, limit);

        // Apply cursor pagination
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

        // Map to DTOs
        const result_tweets = filtered_items.map((item) => {
            // Pass true for is_reposted_view if this item has a reposter
            const is_reposted_view = !!(item.reposter_user && item.repost_id);
            const dto = TweetMapper.toDTO(item.tweet, current_user_id, is_reposted_view);
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

        const next_cursor =
            filtered_items.length > 0
                ? `${filtered_items[filtered_items.length - 1].sort_date.toISOString()}_${filtered_items[filtered_items.length - 1].sort_id}`
                : null;

        const total_count = tweets.length + reposts.length;

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
        cursor?: string,
        limit: number = 20
    ): Promise<{
        data: {
            id: string;
            username: string;
            name: string;
            avatar_url: string;
            verified: boolean;
        }[];
        count: number;
        next_cursor: string | null;
        has_more: boolean;
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

        // Build query for tweet likes with user information
        const query = this.tweet_like_repository
            .createQueryBuilder('like')
            .leftJoinAndSelect('like.user', 'user')
            .where('like.tweet_id = :tweet_id', { tweet_id })
            .orderBy('like.user_id', 'DESC')
            .take(limit);

        // Apply cursor-based pagination
        if (cursor) {
            query.andWhere('like.user_id < :cursor', { cursor });
        }

        const likes = await query.getMany();

        // Map to user response format
        const users = likes.map((like) => ({
            id: like.user.id,
            username: like.user.username,
            name: like.user.name,
            avatar_url: like.user.avatar_url || '',
            verified: like.user.verified,
        }));

        // Generate next_cursor from the last like
        const next_cursor = likes.length > 0 ? likes[likes.length - 1].user_id : null;

        return {
            data: users,
            count: tweet.num_likes,
            next_cursor,
            has_more: likes.length === limit,
        };
    }

    async getTweetReposts(
        tweet_id: string,
        current_user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<{
        data: {
            id: string;
            username: string;
            name: string;
            avatar_url: string;
            verified: boolean;
        }[];
        count: number;
        next_cursor: string | null;
        has_more: boolean;
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

        // Build query for tweet reposts with user information
        const query = this.tweet_repost_repository
            .createQueryBuilder('repost')
            .leftJoinAndSelect('repost.user', 'user')
            .where('repost.tweet_id = :tweet_id', { tweet_id })
            .orderBy('repost.user_id', 'DESC')
            .take(limit);

        // Apply cursor-based pagination
        if (cursor) {
            query.andWhere('repost.user_id < :cursor', { cursor });
        }

        const reposts = await query.getMany();

        // Map to user response format
        const users = reposts.map((repost) => ({
            id: repost.user.id,
            username: repost.user.username,
            name: repost.user.name,
            avatar_url: repost.user.avatar_url || '',
            verified: repost.user.verified,
        }));

        // Generate next_cursor from the last repost
        const next_cursor = reposts.length > 0 ? reposts[reposts.length - 1].user_id : null;

        return {
            data: users,
            count: tweet.num_reposts,
            next_cursor,
            has_more: reposts.length === limit,
        };
    }

    async getTweetQuotes(
        tweet_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 20
    ): Promise<{
        data: TweetResponseDTO[];
        count: number;
        next_cursor: string | null;
        has_more: boolean;
    }> {
        // Check if tweet exists
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
            select: ['tweet_id', 'num_quotes'],
        });

        if (!tweet) throw new NotFoundException('Tweet not found');

        // Build query for quote tweets
        const query = this.tweet_quote_repository
            .createQueryBuilder('quote')
            .leftJoinAndSelect('quote.quote_tweet', 'quote_tweet')
            .leftJoinAndSelect('quote_tweet.user', 'user')
            .leftJoinAndSelect('quote_tweet.likes', 'likes')
            .leftJoinAndSelect('quote_tweet.reposts', 'reposts')
            .where('quote.original_tweet_id = :tweet_id', { tweet_id })
            .orderBy('quote_tweet.created_at', 'DESC')
            .addOrderBy('quote_tweet.tweet_id', 'DESC')
            .take(limit);

        // Apply cursor-based pagination
        if (cursor) {
            const [cursor_timestamp, cursor_id] = cursor.split('_');
            if (cursor_timestamp && cursor_id) {
                const cursor_date = new Date(cursor_timestamp);
                query.andWhere(
                    '(quote_tweet.created_at < :cursor_date OR (quote_tweet.created_at = :cursor_date AND quote_tweet.tweet_id < :cursor_id))',
                    {
                        cursor_date,
                        cursor_id,
                    }
                );
            }
        }

        const quotes = await query.getMany();

        // Load type information for all quote tweets
        const quote_tweets = quotes.map((q) => q.quote_tweet);
        await Promise.all(quote_tweets.map((qt) => this.loadTweetTypeInfo(qt)));

        // Map to DTOs
        const quote_dtos = quote_tweets.map((qt) => TweetMapper.toDTO(qt, current_user_id));

        // Generate next_cursor
        const next_cursor =
            quote_tweets.length > 0
                ? `${quote_tweets[quote_tweets.length - 1].created_at.toISOString()}_${quote_tweets[quote_tweets.length - 1].tweet_id}`
                : null;

        return {
            data: quote_dtos,
            count: tweet.num_quotes,
            next_cursor,
            has_more: quote_tweets.length === limit,
        };
    }

    /***************************************Helper Methods***************************************/

    /**
     * Load tweet type information (reply_info, quote_info, repost_info) for proper type detection
     */
    private async loadTweetTypeInfo(tweet: Tweet): Promise<Tweet> {
        // Check if this tweet is a reply
        const reply_check = await this.tweet_reply_repository.find({
            where: { reply_tweet_id: tweet.tweet_id },
            take: 1,
        });

        // Check if this tweet is a quote
        const quote_check = await this.tweet_quote_repository.find({
            where: { quote_tweet_id: tweet.tweet_id },
            take: 1,
        });

        // Check if this tweet is a repost (posted by this user)
        const repost_check = await this.tweet_repost_repository.find({
            where: {
                tweet_id: tweet.tweet_id,
                user_id: tweet.user_id,
            },
            take: 1,
        });

        tweet.reply_info = reply_check;
        tweet.quote_info = quote_check;
        tweet.repost_info = repost_check;

        return tweet;
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
