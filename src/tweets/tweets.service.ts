/* eslint-disable */
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    DataSource,
    In,
    QueryRunner,
    Repository,
    SelectQueryBuilder,
    ObjectLiteral,
} from 'typeorm';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
import {
    CreateTweetDTO,
    PaginatedTweetLikesResponseDTO,
    PaginatedTweetRepostsResponseDTO,
    UpdateTweetDTO,
} from './dto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TweetResponseDTO } from './dto/tweet-response.dto';
import { PostgresErrorCodes } from '../shared/enums/postgres-error-codes';
import { Tweet } from './entities/tweet.entity';
import { TweetLike } from './entities/tweet-like.entity';
import { TweetRepost } from './entities/tweet-repost.entity';
import { TweetQuote } from './entities/tweet-quote.entity';
import { TweetReply } from './entities/tweet-reply.entity';
import { TweetBookmark } from './entities/tweet-bookmark.entity';
import { Hashtag } from './entities/hashtags.entity';
import { UserFollows } from '../user/entities/user-follows.entity';
import { User } from '../user/entities/user.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { BlobServiceClient } from '@azure/storage-blob';
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
import { tweet_fields_slect } from './queries/tweet-fields-select.query';
import { categorize_prompt, summarize_prompt, TOPICS } from './constants';
import { CompressVideoJobService } from 'src/background-jobs/videos/compress-video.service';
import { ReplyJobService } from 'src/background-jobs/notifications/reply/reply.service';
import { LikeJobService } from 'src/background-jobs/notifications/like/like.service';
import { RepostJobService } from 'src/background-jobs/notifications/repost/repost.service';
import { QuoteJobService } from 'src/background-jobs/notifications/quote/quote.service';
import { MentionJobService } from 'src/background-jobs/notifications/mention/mention.service';
import { EsIndexTweetJobService } from 'src/background-jobs/elasticsearch/es-index-tweet.service';
import { EsDeleteTweetJobService } from 'src/background-jobs/elasticsearch/es-delete-tweet.service';
import { AiSummaryJobService } from 'src/background-jobs/ai-summary/ai-summary.service';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { Readable } from 'stream';
import Groq from 'groq-sdk';
import { TweetSummary } from './entities/tweet-summary.entity';
import { TweetSummaryResponseDTO } from './dto/tweet-summary-response.dto';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
import { HashtagJobService } from 'src/background-jobs/hashtag/hashtag.service';

import { extractHashtags } from 'twitter-text';
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
        @InjectRepository(TweetBookmark)
        private readonly tweet_bookmark_repository: Repository<TweetBookmark>,
        @InjectRepository(UserFollows)
        private readonly user_follows_repository: Repository<UserFollows>,
        @InjectRepository(UserPostsView)
        private readonly user_posts_view_repository: Repository<UserPostsView>,
        @InjectRepository(TweetSummary)
        private readonly tweet_summary_repository: Repository<TweetSummary>,
        private data_source: DataSource,
        private readonly paginate_service: PaginationService,
        private readonly tweets_repository: TweetsRepository,
        private readonly azure_storage_service: AzureStorageService,
        private readonly reply_job_service: ReplyJobService,
        private readonly like_job_service: LikeJobService,
        private readonly hashtag_job_service: HashtagJobService,
        private readonly es_index_tweet_service: EsIndexTweetJobService,
        private readonly es_delete_tweet_service: EsDeleteTweetJobService,
        private readonly ai_summary_job_service: AiSummaryJobService,
        private readonly repost_job_service: RepostJobService,
        private readonly quote_job_service: QuoteJobService,
        private readonly mention_job_service: MentionJobService,
        private readonly compress_video_job_service: CompressVideoJobService
    ) {}

    private readonly TWEET_IMAGES_CONTAINER = 'post-images';
    private readonly TWEET_VIDEOS_CONTAINER = 'post-videos';

    private readonly groq = new Groq({
        apiKey: process.env.GROQ_API_KEY ?? '',
    });

    /**
     * Handles image upload processing
     * @param file - The uploaded image file (in memory, not saved to disk)
     * @param user_id - The authenticated user's ID
     * @param user_id - The authenticated user's ID
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
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined.');
        }

        const webp_name = image_name.replace(/\.[^/.]+$/, '') + '.webp';

        const webp_buffer = await sharp(image_buffer).webp({ quality: 30 }).toBuffer();

        const blob_service_client = BlobServiceClient.fromConnectionString(connection_string);
        const container_client = blob_service_client.getContainerClient(container_name);

        await container_client.createIfNotExists({ access: 'blob' });

        const block_blob_client = container_client.getBlockBlobClient(webp_name);
        await block_blob_client.upload(webp_buffer, webp_buffer.length);

        return block_blob_client.url;
    }

    /**
     * Handles video upload processing
     * @param file - The uploaded video file (in memory, not saved to disk)
     * @param user_id - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    async uploadVideo(file: Express.Multer.File): Promise<UploadMediaResponseDTO> {
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

    /**
     * Compresses video using pipe/stream (faster, no temp files)
     * @param video_buffer - Raw video buffer
     * @returns Compressed video buffer
     */
    private convertToCompressedMp4(video_buffer: Buffer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const inputStream = new Readable();
            inputStream.push(video_buffer);
            inputStream.push(null);

            const outputChunks: Buffer[] = [];

            ffmpeg(inputStream)
                .outputOptions([
                    '-vcodec libx264',
                    '-crf 28',
                    '-preset veryfast',
                    '-acodec aac',
                    '-movflags +frag_keyframe+empty_moov+faststart',
                ])
                .toFormat('mp4')
                .on('error', (error) => {
                    console.error('FFmpeg error:', error);
                    reject(error instanceof Error ? error : new Error(String(error)));
                })
                .on('end', () => {
                    console.log('FFmpeg conversion completed');
                    resolve(Buffer.concat(outputChunks));
                })
                .pipe()
                .on('data', (chunk: Buffer) => {
                    outputChunks.push(chunk);
                })
                .on('error', (error) => {
                    console.error('Stream error:', error);
                    reject(error instanceof Error ? error : new Error(String(error)));
                });
        });
    }

    /**
     * Uploads video to Azure with compression.
     * Tries fast pipe-based compression first, falls back to uploading original
     * and queuing background job if pipe compression fails.
     * @param video_buffer - Raw video buffer
     * @param video_name - Original filename
     * @returns Azure Blob URL
     */
    private async uploadVideoToAzure(video_buffer: Buffer, video_name: string): Promise<string> {
        const container_name = this.TWEET_VIDEOS_CONTAINER;
        const connection_string = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if (!connection_string) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
        }

        const blob_service_client = BlobServiceClient.fromConnectionString(connection_string);
        const container_client = blob_service_client.getContainerClient(container_name);
        await container_client.createIfNotExists({ access: 'blob' });

        const final_name = video_name.replace(/\.[^/.]+$/, '') + '.mp4';
        const block_blob_client = container_client.getBlockBlobClient(final_name);

        try {
            // Try fast pipe-based compression (no temp files)
            const compressed = await this.convertToCompressedMp4(video_buffer);

            await block_blob_client.upload(compressed, compressed.length, {
                blobHTTPHeaders: {
                    blobContentType: 'video/mp4',
                },
            });

            return block_blob_client.url;
        } catch (compressionError) {
            // Pipe compression failed - upload original and queue background job
            console.warn(
                `Pipe compression failed for ${final_name}, uploading original and queuing background compression:`,
                compressionError
            );

            // Upload original video without compression
            await block_blob_client.upload(video_buffer, video_buffer.length, {
                blobHTTPHeaders: {
                    blobContentType: 'video/mp4',
                },
            });

            const video_url = block_blob_client.url;

            // Queue background job to compress using temp files (more compatible)
            this.compress_video_job_service
                .queueCompressVideo({
                    video_url,
                    video_name: final_name,
                    container_name: this.TWEET_VIDEOS_CONTAINER,
                })
                .catch((error) => {
                    console.error(`Failed to queue compression job for ${final_name}:`, error);
                });

            return video_url;
        }
    }

    // remove user from response DTO for documentation
    async createTweet(tweet: CreateTweetDTO, user_id: string): Promise<TweetResponseDTO> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const mentions = await this.extractDataFromTweets(tweet, user_id, query_runner);
            // watch the error which could exist if user id not found here
            const new_tweet = query_runner.manager.create(Tweet, {
                user_id,
                type: TweetType.TWEET,
                ...tweet,
            });
            const saved_tweet = await query_runner.manager.save(Tweet, new_tweet);
            await query_runner.commitTransaction();

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id: saved_tweet.tweet_id,
            });

            // Send mention notifications after tweet is saved
            if (mentions.length > 0) {
                await this.mentionNotification(mentions, user_id, saved_tweet);
            }

            return plainToInstance(TweetResponseDTO, saved_tweet, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            console.error('Error in createTweet:', error);
            // Check if transaction is still active before rolling back
            if (query_runner.isTransactionActive) {
                await query_runner.rollbackTransaction();
            }
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
            const mentions = await this.extractDataFromTweets(tweet, user_id, query_runner);

            const tweet_to_update = await query_runner.manager.findOne(Tweet, {
                where: { tweet_id },
            });

            if (!tweet_to_update) throw new NotFoundException('Tweet not found');

            query_runner.manager.merge(Tweet, tweet_to_update, { ...tweet });

            if (tweet_to_update.user_id !== user_id)
                throw new BadRequestException('User is not allowed to update this tweet');

            const updated_tweet = await query_runner.manager.save(Tweet, tweet_to_update);
            await query_runner.commitTransaction();

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id: updated_tweet.tweet_id,
            });

            // Send mention notifications for updated tweet
            if (mentions.length > 0) {
                await this.mentionNotification(mentions, user_id, updated_tweet);
            }

            // return TweetMapper.toDTO(tweet_with_type_info);
            return plainToInstance(TweetResponseDTO, updated_tweet, {
                excludeExtraneousValues: true,
            });
        } catch (error) {
            if (query_runner.isTransactionActive) {
                await query_runner.rollbackTransaction();
            }
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    // hard delete tweet
    async deleteTweet(tweet_id: string, user_id: string): Promise<void> {
        try {
            const tweet = await this.tweet_repository.findOne({
                where: { tweet_id },
                select: ['tweet_id', 'user_id', 'type'],
            });

            if (!tweet) throw new NotFoundException('Tweet not found');

            if (tweet.user_id !== user_id) {
                throw new BadRequestException('User is not allowed to delete this tweet');
            }

            await this.queueRepostAndQuoteDeleteJobs(tweet, tweet.type, user_id);

            await this.tweet_repository.delete({ tweet_id });

            await this.es_delete_tweet_service.queueDeleteTweet({
                tweet_id,
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getTweetSummary(tweet_id: string): Promise<TweetSummaryResponseDTO> {
        try {
            const tweet = await this.tweet_repository.findOne({
                where: { tweet_id },
                select: ['content', 'tweet_id'],
            });
            if (!tweet) throw new NotFoundException('Tweet not found');

            const cleanedContent = tweet.content
                .replace(/#[a-zA-Z0-9_]+/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (cleanedContent.length < 120) {
                throw new BadRequestException('Tweet content too short for summary generation.');
            }

            let tweet_summary = await this.tweet_summary_repository.findOne({
                where: { tweet_id },
            });

            if (!tweet_summary) {
                // Queue the summary generation job
                await this.ai_summary_job_service.queueGenerateSummary({
                    tweet_id,
                    content: tweet.content,
                });

                // Wait for the job to complete (with polling)
                for (let i = 0; i < 15; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 250));
                    tweet_summary = await this.tweet_summary_repository.findOne({
                        where: { tweet_id },
                    });
                    if (tweet_summary) {
                        return {
                            tweet_id,
                            summary: tweet_summary.summary,
                        };
                    }
                }
                throw new NotFoundException('Failed to generate summary after retry.');
            }
            return {
                tweet_id,
                summary: tweet_summary.summary,
            };
        } catch (error) {
            throw error;
        }
    }

    async getTweetById(tweet_id: string, current_user_id?: string): Promise<TweetResponseDTO> {
        try {
            return await this.getTweetWithUserById(tweet_id, current_user_id);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getTweetsByIds(
        tweet_ids: string[],
        current_user_id?: string
    ): Promise<TweetResponseDTO[]> {
        try {
            return await this.tweets_repository.getTweetsByIds(tweet_ids, current_user_id);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async likeTweet(tweet_id: string, user_id: string): Promise<void> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const tweet = await query_runner.manager.findOne(Tweet, { where: { tweet_id } });
            if (!tweet) throw new NotFoundException('Tweet not found');

            const new_like = query_runner.manager.create(TweetLike, {
                tweet: { tweet_id },
                user: { id: user_id },
            });

            await query_runner.manager.insert(TweetLike, new_like);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_likes', 1);
            await query_runner.commitTransaction();

            if (tweet.user_id !== user_id)
                this.like_job_service.queueLikeNotification({
                    tweet,
                    like_to: tweet.user_id,
                    liked_by: user_id,
                    action: 'add',
                });

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id,
            });

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id,
            });
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
            const tweet = await query_runner.manager.findOne(Tweet, {
                where: { tweet_id },
                select: ['tweet_id', 'user_id'],
            });
            if (!tweet) throw new NotFoundException('Tweet not found');

            const delete_result = await query_runner.manager.delete(TweetLike, {
                tweet: { tweet_id },
                user: { id: user_id },
            });

            if (delete_result.affected === 0)
                throw new BadRequestException('User has not liked this tweet');

            await query_runner.manager.decrement(Tweet, { tweet_id }, 'num_likes', 1);
            await query_runner.commitTransaction();

            if (tweet.user_id !== user_id)
                this.like_job_service.queueLikeNotification({
                    tweet_id,
                    like_to: tweet.user_id,
                    liked_by: user_id,
                    action: 'remove',
                });

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id,
            });
        } catch (error) {
            await query_runner.rollbackTransaction();
            console.error(error);
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async bookmarkTweet(tweet_id: string, user_id: string): Promise<void> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const tweet_exists = await query_runner.manager.exists(Tweet, { where: { tweet_id } });
            if (!tweet_exists) throw new NotFoundException('Tweet not found');

            const new_bookmark = query_runner.manager.create(TweetBookmark, {
                tweet: { tweet_id },
                user: { id: user_id },
            });

            await query_runner.manager.insert(TweetBookmark, new_bookmark);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_bookmarks', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            if (error.code === PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION)
                throw new BadRequestException('User already bookmarked this tweet');
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async unbookmarkTweet(tweet_id: string, user_id: string): Promise<void> {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const tweet_exists = await query_runner.manager.exists(Tweet, { where: { tweet_id } });
            if (!tweet_exists) throw new NotFoundException('Tweet not found');

            const delete_result = await query_runner.manager.delete(TweetBookmark, {
                tweet: { tweet_id },
                user: { id: user_id },
            });

            if (delete_result.affected === 0)
                throw new BadRequestException('User has not bookmarked this tweet');

            await query_runner.manager.decrement(Tweet, { tweet_id }, 'num_bookmarks', 1);
            await query_runner.commitTransaction();
        } catch (error) {
            await query_runner.rollbackTransaction();
            console.error(error);
            throw error;
        } finally {
            await query_runner.release();
        }
    }

    async repostTweetWithQuote(tweet_id: string, user_id: string, quote: CreateTweetDTO) {
        const query_runner = this.data_source.createQueryRunner();
        await query_runner.connect();
        await query_runner.startTransaction();

        try {
            const parentTweet = await this.getTweetWithUserById(tweet_id, user_id, false);

            const mentions = await this.extractDataFromTweets(quote, user_id, query_runner);

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

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id: saved_quote_tweet.tweet_id,
                parent_id: tweet_id,
            });

            const response = plainToInstance(TweetQuoteResponseDTO, {
                ...saved_quote_tweet,
                quoted_tweet: plainToInstance(TweetResponseDTO, parentTweet, {
                    excludeExtraneousValues: true,
                }),
            });

            if (parentTweet.user?.id && user_id !== parentTweet.user.id)
                this.quote_job_service.queueQuoteNotification({
                    quote_to: parentTweet.user.id,
                    quoted_by: user_id,
                    quote_tweet: saved_quote_tweet,
                    parent_tweet: parentTweet,
                    action: 'add',
                });

            // Send mention notifications for quote tweet
            if (mentions.length > 0) {
                await this.mentionNotification(
                    mentions,
                    user_id,
                    saved_quote_tweet,
                    plainToInstance(TweetResponseDTO, parentTweet, {
                        excludeExtraneousValues: true,
                    })
                );
            }

            // I guess this should vbe returned, it was not returned before
            return response;
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
            const tweet = await query_runner.manager.findOne(Tweet, { where: { tweet_id } });
            if (!tweet) throw new NotFoundException('Tweet not found');
            const new_repost = query_runner.manager.create(TweetRepost, {
                tweet_id,
                user_id,
            });
            await query_runner.manager.insert(TweetRepost, new_repost);
            await query_runner.manager.increment(Tweet, { tweet_id }, 'num_reposts', 1);
            await query_runner.commitTransaction();

            if (tweet.user_id !== user_id)
                this.repost_job_service.queueRepostNotification({
                    repost_to: tweet.user_id,
                    reposted_by: user_id,
                    tweet,
                    action: 'add',
                });

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id: tweet_id,
            });
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
                select: ['user_id', 'tweet_id'],
            });

            if (!repost) throw new NotFoundException('Repost not found');

            if (repost.user_id !== user_id)
                throw new ForbiddenException('You can only delete your own reposts');

            // Delete the repost
            await query_runner.manager.delete(TweetRepost, { tweet_id, user_id });

            // Decrement the repost count
            await query_runner.manager.decrement(
                Tweet,
                { tweet_id: repost.tweet_id },
                'num_reposts',
                1
            );

            this.repost_job_service.queueRepostNotification({
                repost_to: user_id,
                reposted_by: user_id,
                tweet_id: tweet_id,
                action: 'remove',
            });

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id: tweet_id,
            });

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
                }),
                query_runner.manager.findOne(TweetReply, {
                    where: { reply_tweet_id: original_tweet_id },
                }),
            ]);

            if (!original_tweet) throw new NotFoundException('Original tweet not found');

            const mentions = await this.extractDataFromTweets(reply_dto, user_id, query_runner);

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
            await query_runner.manager.increment(
                Tweet,
                { tweet_id: original_tweet_id },
                'num_replies',
                1
            );

            await query_runner.commitTransaction();

            if (user_id !== original_tweet.user_id)
                this.reply_job_service.queueReplyNotification({
                    reply_tweet: saved_reply_tweet,
                    original_tweet: original_tweet,
                    replied_by: user_id,
                    reply_to: original_tweet.user_id,
                    conversation_id: original_reply?.conversation_id || original_tweet_id,
                    action: 'add',
                });

            // Send mention notifications for reply
            if (mentions.length > 0) {
                await this.mentionNotification(mentions, user_id, saved_reply_tweet);
            }

            const returned_reply = plainToInstance(
                TweetReplyResponseDTO,
                {
                    ...tweet_reply,
                    ...saved_reply_tweet,
                },
                { excludeExtraneousValues: false }
            );

            returned_reply.parent_tweet_id = original_tweet_id;

            await this.es_index_tweet_service.queueIndexTweet({
                tweet_id: saved_reply_tweet.tweet_id,
                parent_id: original_tweet_id,
                conversation_id: original_reply?.conversation_id || original_tweet_id,
            });

            return returned_reply;
        } catch (error) {
            await query_runner.rollbackTransaction();
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
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getTweetLikes(
        tweet_id: string,
        current_user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<PaginatedTweetLikesResponseDTO> {
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
            .where('like.tweet_id = :tweet_id', { tweet_id })
            .orderBy('like.created_at', 'DESC')
            .addOrderBy('like.user_id', 'DESC')
            .take(limit);

        // Apply cursor-based pagination
        this.paginate_service.applyCursorPagination(
            query_builder,
            cursor,
            'like',
            'created_at',
            'user_id'
        );

        const likes = await query_builder.getMany();

        const data = plainToInstance(
            PaginatedTweetLikesResponseDTO,
            {
                data: likes.map((like) => {
                    return {
                        ...like.user,
                        is_following: !!like.following_relation,
                        is_follower: !!like.follower_relation,
                    };
                }),
            },
            {
                excludeExtraneousValues: true,
            }
        );

        // Generate next_cursor using pagination service
        const next_cursor = this.paginate_service.generateNextCursor(
            likes,
            'created_at',
            'user_id'
        );

        data.next_cursor = next_cursor;
        data.has_more = likes.length === limit;

        return data;
    }

    async getTweetReposts(
        tweet_id: string,
        current_user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<PaginatedTweetRepostsResponseDTO> {
        // Check if tweet exists and get the owner
        const tweet = await this.tweet_repository.findOne({
            where: { tweet_id },
            select: ['tweet_id', 'num_reposts', 'user_id'],
        });

        if (!tweet) throw new NotFoundException('Tweet not found');

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
            .where('repost.tweet_id = :tweet_id', { tweet_id })
            .orderBy('repost.created_at', 'DESC')
            .addOrderBy('repost.user_id', 'DESC')
            .take(limit);

        // Apply cursor-based pagination
        this.paginate_service.applyCursorPagination(
            query_builder,
            cursor,
            'repost',
            'created_at',
            'user_id'
        );

        const reposts = await query_builder.getMany();

        const data = plainToInstance(
            PaginatedTweetRepostsResponseDTO,
            {
                data: reposts.map((repost) => {
                    return {
                        ...repost.user,
                        is_following: !!repost.following_relation,
                        is_follower: !!repost.follower_relation,
                    };
                }),
            },
            {
                excludeExtraneousValues: true,
            }
        );

        // Generate next_cursor using pagination service
        const next_cursor = this.paginate_service.generateNextCursor(
            reposts,
            'created_at',
            'user_id'
        );

        data.next_cursor = next_cursor;
        data.has_more = reposts.length === limit;

        return data;
    }

    async getTweetQuotes(
        tweet_id: string,
        current_user_id?: string,
        cursor?: string,
        limit: number = 20
    ) {
        const tweet = await this.tweet_repository
            .createQueryBuilder('tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .where('tweet.tweet_id = :tweet_id', { tweet_id })
            .select(tweet_fields_slect)
            .getOne();

        if (!tweet) throw new NotFoundException('Tweet not found');

        // Build query for quote tweets
        let query = this.tweet_quote_repository
            .createQueryBuilder('quote')
            .leftJoinAndSelect('quote.quote_tweet', 'quote_tweet')
            .leftJoinAndSelect('quote_tweet.user', 'user')
            .where('quote.original_tweet_id = :tweet_id', { tweet_id })
            .orderBy('quote_tweet.created_at', 'DESC')
            .addOrderBy('quote_tweet.tweet_id', 'DESC')
            .take(limit);

        // Add interaction joins if current_user_id is provided
        query = this.tweets_repository.attachUserTweetInteractionFlags(
            query,
            current_user_id,
            'quote_tweet'
        );

        // Apply cursor-based pagination using pagination service
        this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'quote_tweet',
            'created_at',
            'tweet_id'
        );

        const quotes = await query.getMany();

        // Map to DTOs
        const quote_dtos = quotes.map((quote) => {
            const quote_temp = plainToInstance(TweetQuoteResponseDTO, quote.quote_tweet, {
                excludeExtraneousValues: true,
            });
            quote_temp.parent_tweet_id = tweet_id;
            return quote_temp;
        });

        // Generate next_cursor using pagination service
        const quote_tweets = quotes.map((q) => q.quote_tweet);
        const next_cursor = this.paginate_service.generateNextCursor(
            quote_tweets,
            'created_at',
            'tweet_id'
        );

        return {
            data: quote_dtos,
            count: tweet.num_quotes,
            parent: tweet,
            next_cursor,
            has_more: quote_tweets.length === limit,
        };
    }

    /***************************************Helper Methods***************************************/
    private async queueRepostAndQuoteDeleteJobs(
        tweet: Tweet,
        type: TweetType,
        user_id: string
    ): Promise<void> {
        try {
            if (type === TweetType.REPLY) {
                const tweet_reply = await this.tweet_reply_repository.findOne({
                    where: { reply_tweet_id: tweet.tweet_id },
                });

                if (tweet_reply?.original_tweet_id) {
                    const original_tweet = await this.tweet_repository.findOne({
                        where: { tweet_id: tweet_reply.original_tweet_id },
                        select: ['user_id'],
                    });
                    const parent_owner_id = original_tweet?.user_id || null;

                    if (!parent_owner_id) return;

                    this.reply_job_service.queueReplyNotification({
                        reply_tweet_id: tweet.tweet_id,
                        reply_to: parent_owner_id || user_id,
                        replied_by: user_id,
                        action: 'remove',
                    });
                }
            } else if (type === TweetType.QUOTE) {
                const tweet_quote = await this.tweet_quote_repository.findOne({
                    where: { quote_tweet_id: tweet.tweet_id },
                });

                if (tweet_quote?.original_tweet_id) {
                    const original_tweet = await this.tweet_repository.findOne({
                        where: { tweet_id: tweet_quote.original_tweet_id },
                        select: ['user_id'],
                    });
                    const parent_owner_id = original_tweet?.user_id || null;

                    if (!parent_owner_id) return;

                    this.quote_job_service.queueQuoteNotification({
                        quote_tweet_id: tweet.tweet_id,
                        quote_to: parent_owner_id,
                        quoted_by: user_id,
                        action: 'remove',
                    });
                }
            }

            // Handle mention notifications removal for any tweet type
            await this.queueMentionDeleteJobs(tweet, user_id);
        } catch (error) {
            console.error('Error fetching parent tweet owner:', error);
        }
    }

    private async queueMentionDeleteJobs(tweet: Tweet, user_id: string): Promise<void> {
        try {
            // Fetch the full tweet to get the content
            const full_tweet = await this.tweet_repository.findOne({
                where: { tweet_id: tweet.tweet_id },
                select: ['tweet_id', 'content'],
            });

            if (!full_tweet?.content) return;

            // Extract mentions from the tweet content
            const mentions = full_tweet.content.match(/@([a-zA-Z0-9_]+)/g) || [];
            if (mentions.length === 0) return;

            // Remove @ symbol and make unique
            const clean_usernames = [...new Set(mentions.map((u) => u.replace('@', '')))];

            // Queue mention removal notification (background job will fetch user IDs)
            await this.mention_job_service.queueMentionNotification({
                tweet_id: tweet.tweet_id,
                mentioned_by: user_id,
                mentioned_usernames: clean_usernames,
                tweet_type: 'tweet',
                action: 'remove',
            });
        } catch (error) {
            console.error('Error queueing mention removal notifications:', error);
        }
    }

    private async getTweetWithUserById(
        tweet_id: string,
        current_user_id?: string,
        flag: boolean = true,
        include_replies: boolean = true,
        replies_limit: number = 3
    ): Promise<TweetResponseDTO> {
        try {
            let query = this.tweet_repository
                .createQueryBuilder('tweet')
                .leftJoinAndSelect('tweet.user', 'user')
                .where('tweet.tweet_id = :tweet_id', { tweet_id })
                .select(tweet_fields_slect);

            // Map interaction flags to the entity using leftJoinAndMapOne
            query = this.tweets_repository.attachUserTweetInteractionFlags(
                query,
                current_user_id,
                'tweet'
            );

            const tweet = await query.getOne();
            if (!tweet) throw new NotFoundException('Tweet not found');

            // Transform current tweet to DTO
            const tweet_dto = plainToInstance(TweetResponseDTO, tweet, {
                excludeExtraneousValues: true,
            });

            if (!flag) return tweet_dto;

            // If this is a reply, delegate to getReplyWithUserById to get the cascaded parent tweets
            const reply_info = await this.getReplyWithUserById(tweet_id, current_user_id);
            if (reply_info) {
                if (reply_info.parent_tweet) {
                    tweet_dto.parent_tweet = reply_info.parent_tweet;
                }
                if (reply_info.parent_tweet_id) {
                    tweet_dto.parent_tweet_id = reply_info.parent_tweet_id;
                }
            }

            // Fetch limited replies if requested and tweet has replies
            if (include_replies && tweet.num_replies > 0) {
                const replies_result = await this.tweets_repository.getReplies(
                    tweet_id,
                    current_user_id,
                    { limit: replies_limit }
                );
                tweet_dto.replies = replies_result.tweets;
            }

            return tweet_dto;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    private async getReplyWithUserById(
        tweet_id: string,
        current_user_id?: string
    ): Promise<TweetResponseDTO> {
        try {
            const reply_chain = await this.tweets_repository.getReplyWithParentChain(
                tweet_id,
                current_user_id
            );

            if (!reply_chain || reply_chain.length === 0) {
                throw new NotFoundException('Tweet not found');
            }

            // Build nested structure from deepest parent to starting tweet
            let parent_tweet_dto: TweetResponseDTO | null = null;

            for (let i = reply_chain.length - 1; i >= 0; i--) {
                const raw_tweet = reply_chain[i];

                raw_tweet.user = {
                    ...raw_tweet.user,
                    is_liked: raw_tweet.is_liked,
                    is_reposted: raw_tweet.is_reposted,
                    is_following: raw_tweet.is_following,
                };

                delete raw_tweet.is_liked;
                delete raw_tweet.is_reposted;
                delete raw_tweet.is_following;

                const tweet_dto = plainToInstance(TweetResponseDTO, raw_tweet, {
                    excludeExtraneousValues: true,
                });

                // Attach parent from previous iteration
                if (parent_tweet_dto) tweet_dto.parent_tweet = parent_tweet_dto;

                // Set parent_tweet_id if there's a parent
                if (raw_tweet.parent_tweet_id)
                    tweet_dto.parent_tweet_id = raw_tweet.parent_tweet_id;

                parent_tweet_dto = tweet_dto;
            }

            return parent_tweet_dto!;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    private async extractDataFromTweets(
        tweet: CreateTweetDTO | UpdateTweetDTO,
        user_id: string,
        query_runner: QueryRunner
    ): Promise<string[]> {
        const { content } = tweet;
        if (!content) return [];
        console.log('content:', content);

        // Extract mentions and return them for later processing
        const mentions = content.match(/@([a-zA-Z0-9_]+)/g) || [];

        // Extract hashtags and remove duplicates
        const hashtags: string[] = extractHashtags(content) || [];

        console.log(hashtags);

        const unique_hashtags = [...new Set(hashtags)];
        const normalized_hashtags = hashtags.map((hashtag) => {
            return hashtag.toLowerCase();
        });

        await this.updateHashtags([...new Set(normalized_hashtags)], user_id, query_runner);

        // Extract topics using Groq AI
        const topics = await this.extractTopics(content, unique_hashtags);
        console.log('Extracted topics:', topics);

        //Insert Hashtag with Topics in redis

        await this.hashtag_job_service.queueHashtag({
            hashtags: topics.hashtags,
            timestamp: Date.now(),
        });

        // You can store topics in the tweet entity or use them for recommendations
        // For example, you could add a 'topics' field to your Tweet entity
        // tweet.topics = topics;

        return mentions;
    }

    async extractTopics(
        content: string,
        hashtags: string[]
    ): Promise<{
        tweet: Record<string, number>;
        hashtags: Record<string, Record<string, number>>;
    }> {
        try {
            if (!process.env.ENABLE_GROQ || !process.env.MODEL_NAME) {
                console.warn('Groq is disabled, returning empty topics');
                const empty: Record<string, number> = {};
                TOPICS.forEach((t) => (empty[t] = 0));
                const result: Record<string, Record<string, number>> = {};
                hashtags.forEach((h) => {
                    result[h] = { ...empty };
                });

                return { tweet: empty, hashtags: result };
            }
            console.log('HASHTAGS: ', hashtags);
            // remove hashtags and extra spaces
            content = content
                .replace(/#[^\s]+/g, '') // remove anything starting with
                .replace(/\s+/g, ' ')
                .trim();

            const prompt = categorize_prompt(content, hashtags);

            const response = await this.groq.chat.completions.create({
                model: process.env.MODEL_NAME,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            });

            const rawText = response.choices?.[0]?.message?.content?.trim() ?? '';
            if (!rawText) {
                console.warn('Groq returned empty response');
                const empty: Record<string, number> = {};
                TOPICS.forEach((t) => (empty[t] = 0));
                const result: Record<string, Record<string, number>> = {};
                hashtags.forEach((h) => {
                    result[h] = { ...empty };
                });

                return { tweet: empty, hashtags: result };
            }

            let jsonText = rawText;
            const m = rawText.match(/\{[\s\S]*\}/);
            if (m) jsonText = m[0];

            let parsed = JSON.parse(jsonText);

            const text_total = Object.values<number>(parsed.text).reduce(
                (a, b) => a + Number(b),
                0
            );
            if (Math.abs(text_total - 100) > 1) {
                console.warn('Normalizing tweet topics...');
                for (const k of Object.keys(parsed.text)) {
                    parsed.text[k] = Math.round((parsed.text[k] / text_total) * 100);
                }
            }

            // Normalize each hashtag's topics
            for (const hashtag_key of Object.keys(parsed).filter((k) => k !== 'text')) {
                const hashtag_topics = parsed[hashtag_key];
                const hashtag_total = Object.values<number>(hashtag_topics).reduce(
                    (a, b) => a + Number(b),
                    0
                );

                if (Math.abs(hashtag_total - 100) > 1) {
                    console.warn(`Normalizing ${hashtag_key} topics...`);
                    for (const k of Object.keys(hashtag_topics)) {
                        hashtag_topics[k] = Math.round((hashtag_topics[k] / hashtag_total) * 100);
                    }
                }
            }

            // Restructure to match return type
            return {
                tweet: parsed.text,
                hashtags: Object.keys(parsed)
                    .filter((k) => k !== 'text')
                    .reduce(
                        (acc, key) => {
                            acc[key] = parsed[key];
                            return acc;
                        },
                        {} as Record<string, Record<string, number>>
                    ),
            };
        } catch (error) {
            console.error('Error extracting topics with Groq:', error);
            throw error;
        }
    }

    private async mentionNotification(
        usernames: string[],
        user_id: string,
        tweet: Tweet,
        parent_tweet?: TweetResponseDTO
    ): Promise<void> {
        if (usernames.length === 0) return;

        try {
            // Remove @ symbol from usernames and make them unique
            const clean_usernames = [...new Set(usernames.map((u) => u.replace('@', '')))];

            // Queue mention notification with usernames (background job will fetch user IDs)
            await this.mention_job_service.queueMentionNotification({
                tweet,
                tweet_id: tweet.tweet_id,
                parent_tweet,
                mentioned_by: user_id,
                mentioned_usernames: clean_usernames,
                tweet_type: tweet.type,
                action: 'add',
            });
        } catch (error) {
            console.error('Error queueing mention notifications:', error);
        }
    }

    private async updateHashtags(
        names: string[],
        user_id: string,
        query_runner: QueryRunner
    ): Promise<void> {
        if (names.length === 0) return;

        const hashtags = names.map((name) => ({ name, created_by: { id: user_id } }) as Hashtag);
        await query_runner.manager.upsert(Hashtag, hashtags, {
            conflictPaths: ['name'],
            upsertType: 'on-conflict-do-update',
        });
        await query_runner.manager.increment(Hashtag, { name: In(names) }, 'usage_count', 1);
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

    async getUserBookmarks(
        user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            count: number;
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        let query = this.tweet_bookmark_repository
            .createQueryBuilder('bookmark')
            .leftJoinAndSelect('bookmark.tweet', 'tweet')
            .leftJoinAndSelect('tweet.user', 'user')
            .where('bookmark.user_id = :user_id', { user_id })
            .orderBy('bookmark.created_at', 'DESC')
            .addOrderBy('bookmark.tweet_id', 'DESC')
            .take(limit);

        this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'bookmark',
            'created_at',
            'tweet_id'
        );

        const bookmarks = await query.getMany();

        if (bookmarks.length === 0) {
            return {
                data: [],
                pagination: {
                    count: 0,
                    next_cursor: null,
                    has_more: false,
                },
            };
        }

        const tweet_dtos = await Promise.all(
            bookmarks.map(async (bookmark) => {
                return await this.getTweetWithUserById(
                    bookmark.tweet.tweet_id,
                    user_id,
                    true, // flag to include parent tweets
                    false, // don't include replies
                    0 // replies_limit
                );
            })
        );

        // Generate next_cursor using pagination service
        const next_cursor = this.paginate_service.generateNextCursor(
            bookmarks,
            'created_at',
            'tweet_id'
        );

        return {
            data: tweet_dtos,
            pagination: {
                count: tweet_dtos.length,
                next_cursor,
                has_more: bookmarks.length === limit,
            },
        };
    }
}
