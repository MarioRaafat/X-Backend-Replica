/* eslint-disable */
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
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
import { User } from '../user/entities/user.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { BlobServiceClient } from '@azure/storage-blob';
import { GoogleGenAI } from '@google/genai';
import { TweetsRepository } from './tweets.repository';
import { TimelinePaginationDto } from 'src/timeline/dto/timeline-pagination.dto';
import { GetTweetRepliesQueryDto } from './dto';
import { plainToInstance } from 'class-transformer';
import { TweetQuoteResponseDTO } from './dto/tweet-quote-reponse';
import { AzureStorageService } from 'src/azure-storage/azure-storage.service';
import { TweetReplyResponseDTO } from './dto/tweet-reply-response';
import { TweetType } from 'src/shared/enums/tweet-types.enum';
import { UserPostsView } from './entities/user-posts-view.entity';
import e from 'express';

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
        @InjectRepository(UserPostsView)
        private readonly user_posts_view_repository: Repository<UserPostsView>,
        private data_source: DataSource,
        private readonly paginate_service: PaginationService,
        private readonly tweets_repository: TweetsRepository,
        private readonly azure_storage_service: AzureStorageService
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

    // remove user from response DTO for documentation
    async createTweet(tweet: CreateTweetDTO, user_id: string): Promise<TweetResponseDTO> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            await this.extractDataFromTweets(tweet, user_id, query_runner);
            const extracted_topics = this.extractTopics(tweet.content);
            // watch the error which could exist if user id not found here
            const new_tweet = query_runner.manager.create(Tweet, {
                user_id,
                type: TweetType.TWEET,
                ...tweet,
            });
            const saved_tweet = await query_runner.manager.save(Tweet, new_tweet);
            await query_runner.commitTransaction();

            return plainToInstance(TweetResponseDTO, saved_tweet, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    // remove user from response DTO for documentation
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

            const updated_tweet = await query_runner.manager.save(Tweet, tweet_to_update);
            await query_runner.commitTransaction();

            // return TweetMapper.toDTO(tweet_with_type_info);
            return plainToInstance(TweetResponseDTO, updated_tweet, {
                excludeExtraneousValues: true,
            });
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
        try {
            return await this.getTweetWithUserById(tweet_id, current_user_id);
        } catch(error) {
            console.error(error);
            throw error;
        }
    }

    async likeTweet(tweet_id: string, user_id: string): Promise<void> {        
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();
        
        try {
            const tweet_exists = await query_runner.manager.exists(Tweet, { where: { tweet_id } });
            if (!tweet_exists) throw new NotFoundException('Tweet not found');

            const new_like = query_runner.manager.create(TweetLike, {
                tweet: { tweet_id },
                user: { id: user_id },
            });

            await query_runner.manager.insert(TweetLike, new_like);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_likes', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            if (error.code === PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION)
                throw new BadRequestException('User already liked this tweet');
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async unlikeTweet(tweet_id: string, user_id: string): Promise<void> {        
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();
        
        try {
            const tweet_exists = await query_runner.manager.exists(Tweet, { where: { tweet_id } });
            if (!tweet_exists) throw new NotFoundException('Tweet not found');

            const delete_result = await query_runner.manager.delete(TweetLike, {
                tweet: { tweet_id },
                user: { id: user_id },
            });

            if (delete_result.affected === 0)
                throw new BadRequestException('User has not liked this tweet');

            await query_runner.manager.decrement(Tweet, { tweet_id }, 'num_likes', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            console.error(error);
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async repostTweetWithQuote(
        tweet_id: string,
        user_id: string,
        quote: CreateTweetDTO
    ) {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const parentTweet = await this.getTweetWithUserById(tweet_id, user_id);

            await this.extractDataFromTweets(quote, user_id, query_runner);

            const new_quote_tweet = query_runner.manager.create(Tweet, {
                ...quote,
                user_id,
                type: TweetType.QUOTE,
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

            return plainToInstance(TweetQuoteResponseDTO, {
                ...saved_quote_tweet,
                quoted_tweet: plainToInstance(TweetResponseDTO, parentTweet, { 
                    excludeExtraneousValues: true,
                }),
            });
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async repostTweet(tweet_id: string, user_id: string): Promise<void> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();
        
        try {
            const tweet_exists = await query_runner.manager.exists(Tweet, { where: { tweet_id } });
            if (!tweet_exists) throw new NotFoundException('Tweet not found');
            const new_repost = query_runner.manager.create(TweetRepost, {
                tweet_id,
                user_id,
            });
            await query_runner.manager.insert(TweetRepost, new_repost);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_reposts', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            if (error.code === PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION)
                throw new BadRequestException('User already reposted this tweet');
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async deleteRepost(tweet_id: string, user_id: string): Promise<void> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();
        
        try {
            const repost = await query_runner.manager.findOne(TweetRepost, {
                where: { tweet_id, user_id },
                select: ["user_id", "tweet_id"]
            });
    
            if (!repost)
                throw new NotFoundException('Repost not found');
    
            if (repost.user_id !== user_id)
                throw new ForbiddenException('You can only delete your own reposts');

            // Delete the repost
            await query_runner.manager.delete(TweetRepost, { tweet_id, user_id });

            // Decrement the repost count
            await query_runner.manager.decrement(Tweet, { tweet_id: repost.tweet_id }, 'num_reposts', 1);

            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            console.error(error);
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

        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();
        
        try {

            const [original_tweet, original_reply] = await Promise.all([
                query_runner.manager.findOne(Tweet, {
                    where: { tweet_id: original_tweet_id },
                    select: ['tweet_id'],
                }),
                query_runner.manager.findOne(TweetReply, { where: { original_tweet_id } })
            ]);
            
            if (!original_tweet) throw new NotFoundException('Original tweet not found');

            await this.extractDataFromTweets(reply_dto, user_id, query_runner);

            // Create the reply tweet
            const new_reply_tweet = query_runner.manager.create(Tweet, {
                ...reply_dto,
                user_id,
                type: TweetType.REPLY,
            });
            const saved_reply_tweet = await query_runner.manager.save(Tweet, new_reply_tweet);

            // Create the reply relationship
            const tweet_reply = query_runner.manager.create(TweetReply, {
                reply_tweet_id: saved_reply_tweet.tweet_id,
                original_tweet_id,
                user_id,
                conversation_id: original_reply?.conversation_id || original_tweet_id,
            });
            await query_runner.manager.save(TweetReply, tweet_reply);

            // Increment reply count on original tweet
            await query_runner.manager.increment(Tweet, { tweet_id: original_tweet_id }, 'num_replies', 1);

            await query_runner.commitTransaction();

            const returned_reply = plainToInstance(TweetReplyResponseDTO, {
                ...tweet_reply,
                ...saved_reply_tweet,
            }, { excludeExtraneousValues: false });

            returned_reply.parent_tweet_id = original_tweet_id;
            return returned_reply;
        } catch (error) {
            await query_runner.rollbackTransaction();
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async getPostsByUserId(
        user_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 10
    ): Promise<{
        data: TweetResponseDTO[];
        next_cursor: string | null;
        has_more: boolean;
    }> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        
        try {
            // Parse cursor if provided
            let cursor_condition = '';
            let cursor_params: any[] = [];
            
            if (cursor) {
                const [cursor_date_str, cursor_id] = cursor.split('_');
                const cursor_date = new Date(cursor_date_str);
                
                cursor_condition = `AND (post.post_date < $${current_user_id ? '3' : '2'} OR (post.post_date = $${current_user_id ? '3' : '2'} AND post.id < $${current_user_id ? '4' : '3'}))`;
                cursor_params = [cursor_date, cursor_id];
            }
            
            // Build base query
            let query_string = `
                SELECT 
                    post.*,
                    json_build_object(
                        'id', u.id,
                        'username', u.username,
                        'name', u.name,
                        'avatar_url', u.avatar_url,
                        'verified', u.verified,
                        'bio', u.bio,
                        'cover_url', u.cover_url,
                        'followers', u.followers,
                        'following', u.following
                    ) as user,
                    CASE 
                        WHEN post.post_type = 'repost' THEN json_build_object(
                            'id', reposted_by.id,
                            'name', reposted_by.name
                        )
                        ELSE NULL
                    END as reposted_by_user,
                    COALESCE(post.type, 'tweet') as tweet_type
                    ${current_user_id ? `,
                        CASE WHEN likes.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_liked,
                        CASE WHEN reposts.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_reposted,
                        CASE WHEN follows.follower_id IS NOT NULL THEN TRUE ELSE FALSE END as is_following
                    ` : ''}
                FROM user_posts_view post
                LEFT JOIN "user" u ON u.id = post.tweet_author_id
                LEFT JOIN "user" reposted_by ON reposted_by.id = post.profile_user_id AND post.post_type = 'repost'
                ${current_user_id ? `
                    LEFT JOIN tweet_likes likes ON likes.tweet_id = post.tweet_id AND likes.user_id = $2
                    LEFT JOIN tweet_reposts reposts ON reposts.tweet_id = post.tweet_id AND reposts.user_id = $2
                    LEFT JOIN user_follows follows ON follows.follower_id = $2 AND follows.followed_id = u.id
                ` : ''}
                WHERE post.profile_user_id = $1
                ${cursor_condition}
                ORDER BY post.post_date DESC, post.id DESC
                LIMIT ${limit}
            `;

            // Build params array
            let params: any[];
            if (current_user_id) {
                params = [user_id, current_user_id, ...cursor_params];
            } else {
                params = [user_id, ...cursor_params];
            }

            // Execute query using query runner
            const posts = await query_runner.query(query_string, params);

            // Transform to DTOs
            const tweet_dtos = posts.map((post: any) => {
                const dto = plainToInstance(TweetResponseDTO, {
                    tweet_id: post.tweet_id,
                    user_id: post.tweet_author_id,
                    type: post.tweet_type || post.type || 'tweet',
                    content: post.content,
                    images: post.images,
                    videos: post.videos,
                    num_likes: post.num_likes,
                    num_reposts: post.num_reposts,
                    num_views: post.num_views,
                    num_quotes: post.num_quotes,
                    num_replies: post.num_replies,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    current_user_like: current_user_id && post.is_liked ? { user_id: current_user_id } : null,
                    current_user_repost: current_user_id && post.is_reposted ? { user_id: current_user_id } : null,
                    user: post.user,
                }, {
                    excludeExtraneousValues: true,
                });

                // Add reposted_by information if this is a repost
                if (post.post_type === 'repost' && post.reposted_by_user) {
                    dto.reposted_by = {
                        repost_id: post.id,
                        id: post.reposted_by_user.id,
                        name: post.reposted_by_user.name,
                        reposted_at: post.post_date,
                    };
                }

                return dto;
            });

            // Generate next cursor using pagination service
            const next_cursor = this.paginate_service.generateNextCursor(posts, 'post_date', 'id');

            return {
                data: tweet_dtos,
                next_cursor,
                has_more: posts.length === limit,
            };
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async incrementTweetViews(tweet_id: string): Promise<{ success: boolean }> {
        try {
            const tweet = await this.tweet_repository.findOne({
                where: { tweet_id },
            });
    
            if (!tweet) throw new NotFoundException('Tweet not found');
    
            await this.tweet_repository.increment({ tweet_id }, 'num_views', 1);
    
            return { success: true };
        } catch(error) {
            console.error(error);
            throw error;
        }
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
            is_follower: boolean;
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

        // Build single query with all joins including follow relationships
        const query_builder = this.tweet_like_repository
            .createQueryBuilder('like')
            .leftJoinAndSelect('like.user', 'user')
            .leftJoinAndMapOne(
                'like.follower_relation',
                UserFollows,
                'follower_relation',
                'follower_relation.follower_id = user.id AND follower_relation.followed_id = :current_user_id',
                { current_user_id }
            )
            .leftJoinAndMapOne(
                'like.following_relation',
                UserFollows,
                'following_relation',
                'following_relation.follower_id = :current_user_id AND following_relation.followed_id = user.id',
                { current_user_id }
            )
            .where('like.tweet_id = :tweet_id', { tweet_id });

        const paginated_result = await this.paginate_service.paginate(
            query_builder,
            { page, limit, sort_by: 'user_id', sort_order: 'DESC' },
            'like',
            ['user_id', 'tweet_id']
        );

        const users = paginated_result.data.map((like) => ({
            id: like.user.id,
            username: like.user.username,
            name: like.user.name,
            avatar_url: like.user.avatar_url || '',
            verified: like.user.verified,
            is_follower: !!like.follower_relation,
            bio: like.user.bio,
            cover_url: like.user.cover_url,
            followers: like.user.followers,
            following: like.user.following,
            is_following: !!like.following_relation,
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
            is_follower: boolean;
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

        // Build single query with all joins including follow relationships
        const query_builder = this.tweet_repost_repository
            .createQueryBuilder('repost')
            .leftJoinAndSelect('repost.user', 'user')
            .leftJoinAndMapOne(
                'repost.follower_relation',
                UserFollows,
                'follower_relation',
                'follower_relation.follower_id = user.id AND follower_relation.followed_id = :current_user_id',
                { current_user_id }
            )
            .leftJoinAndMapOne(
                'repost.following_relation',
                UserFollows,
                'following_relation',
                'following_relation.follower_id = :current_user_id AND following_relation.followed_id = user.id',
                { current_user_id }
            )
            .where('repost.tweet_id = :tweet_id', { tweet_id });

        const paginated_result = await this.paginate_service.paginate(
            query_builder,
            { page, limit, sort_by: 'created_at', sort_order: 'DESC' },
            'repost',
            ['created_at', 'id']
        );

        const users = paginated_result.data.map((repost) => ({
            id: repost.user.id,
            username: repost.user.username,
            name: repost.user.name,
            avatar_url: repost.user.avatar_url || '',
            verified: repost.user.verified,
            is_follower: !!repost.follower_relation,
            bio: repost.user.bio,
            cover_url: repost.user.cover_url,
            followers: repost.user.followers,
            following: repost.user.following,
            is_following: !!repost.following_relation,
        }));

        return {
            data: users,
            pagination: paginated_result.pagination,
        };
    }

    async getTweetQuotes(
        tweet_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 20
    ) {
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id }
        });

        console.log(tweet);

        if (!tweet) throw new NotFoundException('Tweet not found');

        // Build query for quote tweets
        const query = this.tweet_quote_repository
            .createQueryBuilder('quote')
            .leftJoinAndSelect('quote.quote_tweet', 'quote_tweet')
            .leftJoinAndSelect('quote_tweet.user', 'user')
            .where('quote.original_tweet_id = :tweet_id', { tweet_id })
            .orderBy('quote_tweet.created_at', 'DESC')
            .addOrderBy('quote_tweet.tweet_id', 'DESC')
            .take(limit);

        // Add interaction joins if current_user_id is provided
        if (current_user_id) {
            query
                .leftJoinAndMapOne(
                    'quote_tweet.current_user_like',
                    TweetLike,
                    'current_user_like',
                    'current_user_like.tweet_id = quote_tweet.tweet_id AND current_user_like.user_id = :current_user_id',
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    'quote_tweet.current_user_repost',
                    TweetRepost,
                    'current_user_repost',
                    'current_user_repost.tweet_id = quote_tweet.tweet_id AND current_user_repost.user_id = :current_user_id',
                    { current_user_id }
                )
                .leftJoinAndMapOne(
                    'user.current_user_follows',
                    UserFollows,
                    'current_user_follows',
                    'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
                    { current_user_id }
                );
        }

        // Apply cursor-based pagination using pagination service
        this.paginate_service.applyCursorPagination(query, cursor, 'quote_tweet', 'created_at', 'tweet_id');

        const quotes = await query.getMany();

        // Map to DTOs
        const quote_dtos = quotes.map((quote) => 
            plainToInstance(TweetQuoteResponseDTO, quote.quote_tweet, {
                excludeExtraneousValues: true,
            })
        );

        // Generate next_cursor using pagination service
        const quote_tweets = quotes.map((q) => q.quote_tweet);
        const next_cursor = this.paginate_service.generateNextCursor(quote_tweets, 'created_at', 'tweet_id');

        return {
            data: quote_dtos,
            count: tweet.num_quotes,
            parent: tweet,
            next_cursor,
            has_more: quote_tweets.length === limit,
        };
    }

    /***************************************Helper Methods***************************************/

    private async getTweetWithUserById(tweet_id: string, current_user_id?: string): Promise<TweetResponseDTO> {
        try {
            const query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .where('tweet.tweet_id = :tweet_id', { tweet_id })
            .select([
                'tweet.tweet_id',
                'tweet.user_id',
                'tweet.type',
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
                'user.bio',
                'user.cover_url',
                'user.followers',
                'user.following',
            ]);

            // Map interaction flags to the entity using leftJoinAndMapOne
            if (current_user_id) {
                query
                    .leftJoinAndMapOne(
                        'tweet.current_user_like',
                        TweetLike,
                        'current_user_like',
                        'current_user_like.tweet_id = tweet.tweet_id AND current_user_like.user_id = :current_user_id',
                        { current_user_id }
                    )
                    .leftJoinAndMapOne(
                        'tweet.current_user_repost',
                        TweetRepost,
                        'current_user_repost',
                        'current_user_repost.tweet_id = tweet.tweet_id AND current_user_repost.user_id = :current_user_id',
                        { current_user_id }
                    )
                    .leftJoinAndMapOne(
                        'user.current_user_follows',
                        UserFollows,
                        'current_user_follows',
                        'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
                        { current_user_id }
                    );
            }

            const tweet = await query.getOne();
            if (!tweet) throw new NotFoundException('Tweet not found');

            // Transform current tweet to DTO
            const tweet_dto = plainToInstance(TweetResponseDTO, tweet, {
                excludeExtraneousValues: true,
            });

            // If this is a reply, delegate to getReplyWithUserById to get the cascaded parent tweets
            if (tweet.type === TweetType.REPLY) {
                const parent_tweet_dto = await this.getReplyWithUserById(tweet_id, current_user_id);
                tweet_dto.parent_tweet = parent_tweet_dto as any;
            }

            return tweet_dto;
        } catch(error) {
            console.error(error);
            throw error;
        }
    }

    private async getReplyWithUserById(tweet_id: string, current_user_id?: string): Promise<TweetResponseDTO> {
        try {
            const query = this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .leftJoinAndMapOne(
                'tweet.reply_info',
                TweetReply,
                'reply_info',
                'reply_info.reply_tweet_id = tweet.tweet_id'
            )
            .where('tweet.tweet_id = :tweet_id', { tweet_id })
            .select([
                'tweet.tweet_id',
                'tweet.user_id',
                'tweet.type',
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
                'user.bio',
                'user.cover_url',
                'user.followers',
                'user.following',
                'reply_info.original_tweet_id',
            ]);

            // Map interaction flags to the entity using leftJoinAndMapOne
            if (current_user_id) {
                query
                    .leftJoinAndMapOne(
                        'tweet.current_user_like',
                        TweetLike,
                        'current_user_like',
                        'current_user_like.tweet_id = tweet.tweet_id AND current_user_like.user_id = :current_user_id',
                        { current_user_id }
                    )
                    .leftJoinAndMapOne(
                        'tweet.current_user_repost',
                        TweetRepost,
                        'current_user_repost',
                        'current_user_repost.tweet_id = tweet.tweet_id AND current_user_repost.user_id = :current_user_id',
                        { current_user_id }
                    )
                    .leftJoinAndMapOne(
                        'user.current_user_follows',
                        UserFollows,
                        'current_user_follows',
                        'current_user_follows.follower_id = :current_user_id AND current_user_follows.followed_id = user.id',
                        { current_user_id }
                    );
            }

            const tweet = await query.getOne();
            if (!tweet) throw new NotFoundException('Tweet not found');

            // Transform current tweet to DTO
            const tweet_dto = plainToInstance(TweetResponseDTO, tweet, {
                excludeExtraneousValues: true,
            });

            // If this tweet is also a reply, recursively fetch its parent
            if (tweet.type === TweetType.REPLY && (tweet as any).reply_info?.original_tweet_id) {
                const parent_tweet_dto = await this.getReplyWithUserById(
                    (tweet as any).reply_info.original_tweet_id,
                    current_user_id
                );
                tweet_dto.parent_tweet = parent_tweet_dto as any;
            }

            return tweet_dto;
        } catch(error) {
            console.error(error);
            throw error;
        }
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

            if(!process.env.ENABLE_GOOGLE_GEMINI) {
                console.warn('Gemini is disabled, returning empty topics');
                const empty_response: Record<string, number> = {};
                this.TOPICS.forEach((topic) => (empty_response[topic] = 0));
                return empty_response;
            }

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

    async getTweetReplies(
        tweet_id: string,
        current_user_id: string,
        query_dto: GetTweetRepliesQueryDto
    ): Promise<{
        data: TweetResponseDTO[];
        count: number;
        next_cursor: string | null;
        has_more: boolean;
    }> {
        // First, check if the tweet exists
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
        });

        if (!tweet) {
            throw new NotFoundException('Tweet not found');
        }

        const pagination: TimelinePaginationDto = {
            limit: query_dto.limit ?? 20,
            cursor: query_dto.cursor,
        };

        const { tweets, next_cursor } = await this.tweets_repository.getReplies(
            tweet_id,
            current_user_id,
            pagination
        );

        return {
            data: tweets,
            count: tweets.length,
            next_cursor,
            has_more: next_cursor !== null,
        };
    }
}
