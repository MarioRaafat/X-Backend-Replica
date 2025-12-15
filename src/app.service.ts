import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user/entities/user.entity';
import { Tweet } from './tweets/entities/tweet.entity';
import { UserFollows } from './user/entities/user-follows.entity';
import { TweetLike } from './tweets/entities/tweet-like.entity';
import { TweetReply } from './tweets/entities/tweet-reply.entity';
import { TestDataConstants } from './constants/variables';
import * as bcrypt from 'bcrypt';
import { TweetType } from './shared/enums/tweet-types.enum';
import { ERROR_MESSAGES } from './constants/swagger-messages';
import { UploadFileResponseDto } from './user/dto/upload-file-response.dto';
import { AzureStorageService } from './azure-storage/azure-storage.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
    constructor(
        @InjectRepository(User)
        private readonly user_repository: Repository<User>,
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(UserFollows)
        private readonly user_follows_repository: Repository<UserFollows>,
        @InjectRepository(TweetLike)
        private readonly tweet_like_repository: Repository<TweetLike>,
        @InjectRepository(TweetReply)
        private readonly tweet_reply_repository: Repository<TweetReply>,
        private readonly azure_storage_service: AzureStorageService,
        private readonly config_service: ConfigService
    ) {}

    getHealthStatus(): string {
        return 'Application is running';
    }

    async seedTestData(): Promise<{
        users: Array<{
            action: 'created' | 'already_exists';
            email: string;
            username: string;
            name: string;
            user_id?: string;
        }>;
        tweets: Array<{
            action: 'created' | 'already_exists';
            username: string;
            content: string;
            tweet_id?: string;
        }>;
        follows: {
            action: string;
            affected_count: number;
        };
        replies: {
            action: string;
            affected_count: number;
        };
        likes: {
            action: string;
            affected_count: number;
        };
    }> {
        const users_result: Array<{
            action: 'created' | 'already_exists';
            email: string;
            username: string;
            name: string;
            user_id?: string;
        }> = [];
        const tweets_result: Array<{
            action: 'created' | 'already_exists';
            username: string;
            content: string;
            tweet_id?: string;
        }> = [];
        const created_users: User[] = [];
        const all_tweets: Tweet[][] = [];

        // Step 1: Process each test user
        for (const test_user_data of TestDataConstants.TEST_USERS) {
            let user = await this.user_repository.findOne({
                where: { email: test_user_data.email },
            });

            if (user) {
                users_result.push({
                    action: 'already_exists' as const,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    user_id: user.id,
                });
                created_users.push(user);
            } else {
                const hashed_password = await bcrypt.hash(test_user_data.password, 10);
                const new_user = this.user_repository.create({
                    ...test_user_data,
                    password: hashed_password,
                    avatar_url: (test_user_data as any).avatar_url || null,
                });
                user = await this.user_repository.save(new_user);

                users_result.push({
                    action: 'created' as const,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    user_id: user.id,
                });
                created_users.push(user);
            }
        }

        // Step 2: Process tweets for each user
        for (const tweet_data of TestDataConstants.TEST_TWEETS) {
            const user = created_users[tweet_data.user_index];
            const user_tweets: Tweet[] = [];

            for (const tweet_obj of tweet_data.tweets) {
                const tweet_content = typeof tweet_obj === 'string' ? tweet_obj : tweet_obj.content;
                const tweet_images = typeof tweet_obj === 'string' ? [] : tweet_obj.images || [];

                // Check if tweet already exists
                const existing_tweet = await this.tweet_repository.findOne({
                    where: {
                        user_id: user.id,
                        content: tweet_content,
                    },
                });

                if (existing_tweet) {
                    tweets_result.push({
                        action: 'already_exists' as const,
                        username: user.username,
                        content: tweet_content,
                        tweet_id: existing_tweet.tweet_id,
                    });
                    user_tweets.push(existing_tweet);
                } else {
                    const new_tweet = this.tweet_repository.create({
                        user_id: user.id,
                        content: tweet_content,
                        type: TweetType.TWEET,
                        images: tweet_images,
                        videos: [],
                    });
                    const saved_tweet = await this.tweet_repository.save(new_tweet);

                    tweets_result.push({
                        action: 'created' as const,
                        username: user.username,
                        content: tweet_content,
                        tweet_id: saved_tweet.tweet_id,
                    });
                    user_tweets.push(saved_tweet);
                }
            }

            all_tweets.push(user_tweets);
        }

        // Step 3: Create follows - each user follows all other users
        let follows_count = 0;
        for (let i = 0; i < created_users.length; i++) {
            for (let j = 0; j < created_users.length; j++) {
                if (i !== j) {
                    const existing_follow = await this.user_follows_repository.findOne({
                        where: {
                            follower_id: created_users[i].id,
                            followed_id: created_users[j].id,
                        },
                    });

                    if (!existing_follow) {
                        const new_follow = this.user_follows_repository.create({
                            follower_id: created_users[i].id,
                            followed_id: created_users[j].id,
                        });
                        await this.user_follows_repository.save(new_follow);
                        follows_count++;
                    }
                }
            }
        }

        // Step 4: Create replies between mario, mohsen, and esraa
        let replies_count = 0;
        for (const reply_data of TestDataConstants.TEST_REPLIES) {
            const replier = created_users[reply_data.replier_index];
            const original_tweet =
                all_tweets[reply_data.original_user_index][reply_data.original_tweet_index];

            if (original_tweet) {
                // Check if reply already exists
                const existing_reply_tweet = await this.tweet_repository.findOne({
                    where: {
                        user_id: replier.id,
                        content: reply_data.reply,
                    },
                });

                if (!existing_reply_tweet) {
                    // Create the reply tweet
                    const reply_tweet = this.tweet_repository.create({
                        user_id: replier.id,
                        content: reply_data.reply,
                        type: TweetType.REPLY,
                        images: [],
                        videos: [],
                    });
                    const saved_reply_tweet = await this.tweet_repository.save(reply_tweet);

                    // Create the reply relationship
                    const tweet_reply = this.tweet_reply_repository.create({
                        reply_tweet_id: saved_reply_tweet.tweet_id,
                        original_tweet_id: original_tweet.tweet_id,
                        user_id: replier.id,
                        conversation_id: original_tweet.tweet_id,
                    });
                    await this.tweet_reply_repository.save(tweet_reply);

                    // Increment reply count on original tweet
                    await this.tweet_repository.increment(
                        { tweet_id: original_tweet.tweet_id },
                        'num_replies',
                        1
                    );

                    replies_count++;
                }
            }
        }

        // Step 5: Create likes between mario, mohsen, and esraa
        let likes_count = 0;
        for (const like_data of TestDataConstants.TEST_LIKES) {
            const liker = created_users[like_data.liker_index];
            const liked_tweet = all_tweets[like_data.liked_user_index][like_data.tweet_index];

            if (liked_tweet) {
                const existing_like = await this.tweet_like_repository.findOne({
                    where: {
                        user_id: liker.id,
                        tweet_id: liked_tweet.tweet_id,
                    },
                });

                if (!existing_like) {
                    const new_like = this.tweet_like_repository.create({
                        user_id: liker.id,
                        tweet_id: liked_tweet.tweet_id,
                    });
                    await this.tweet_like_repository.save(new_like);

                    // Increment like count on tweet
                    await this.tweet_repository.increment(
                        { tweet_id: liked_tweet.tweet_id },
                        'num_likes',
                        1
                    );

                    likes_count++;
                }
            }
        }

        return {
            users: users_result,
            tweets: tweets_result,
            follows: {
                action: 'Each user follows all other users',
                affected_count: follows_count,
            },
            replies: {
                action: 'Replies created between main 3 users',
                affected_count: replies_count,
            },
            likes: {
                action: 'Likes created between main 3 users',
                affected_count: likes_count,
            },
        };
    }

    async clearTestData(): Promise<{
        message: string;
        deleted: {
            users: number;
            tweets: number;
            follows: number;
            likes: number;
            replies: number;
        };
    }> {
        let deleted_users = 0;
        let deleted_tweets = 0;
        let deleted_follows = 0;
        let deleted_likes = 0;
        let deleted_replies = 0;

        // Get all test user IDs by email
        const test_emails = TestDataConstants.TEST_USERS.map((user) => user.email);
        const test_users = await this.user_repository.find({
            where: test_emails.map((email) => ({ email })),
        });

        if (test_users.length === 0) {
            return {
                message: 'No test data found to delete',
                deleted: {
                    users: 0,
                    tweets: 0,
                    follows: 0,
                    likes: 0,
                    replies: 0,
                },
            };
        }

        const test_user_ids = test_users.map((user) => user.id);

        // Delete follows where test users are involved
        const deleted_follows_result = await this.user_follows_repository
            .createQueryBuilder()
            .delete()
            .where('follower_id IN (:...ids) OR followed_id IN (:...ids)', { ids: test_user_ids })
            .execute();
        deleted_follows = deleted_follows_result.affected || 0;

        // Get all tweets by test users
        const test_tweets = await this.tweet_repository.find({
            where: test_user_ids.map((id) => ({ user_id: id })),
            select: ['tweet_id'],
        });
        const test_tweet_ids = test_tweets.map((tweet) => tweet.tweet_id);

        if (test_tweet_ids.length > 0) {
            // Delete likes on test users' tweets
            const deleted_likes_result = await this.tweet_like_repository
                .createQueryBuilder()
                .delete()
                .where('tweet_id IN (:...ids) OR user_id IN (:...user_ids)', {
                    ids: test_tweet_ids,
                    user_ids: test_user_ids,
                })
                .execute();
            deleted_likes = deleted_likes_result.affected || 0;

            // Delete replies involving test users' tweets
            const deleted_replies_result = await this.tweet_reply_repository
                .createQueryBuilder()
                .delete()
                .where(
                    'original_tweet_id IN (:...ids) OR reply_tweet_id IN (:...ids) OR user_id IN (:...user_ids)',
                    {
                        ids: test_tweet_ids,
                        user_ids: test_user_ids,
                    }
                )
                .execute();
            deleted_replies = deleted_replies_result.affected || 0;
        }

        // Delete all tweets by test users (cascades will handle related data)
        const deleted_tweets_result = await this.tweet_repository
            .createQueryBuilder()
            .delete()
            .where('user_id IN (:...ids)', { ids: test_user_ids })
            .execute();
        deleted_tweets = deleted_tweets_result.affected || 0;

        // Delete test users (cascades will handle remaining related data)
        const deleted_users_result = await this.user_repository
            .createQueryBuilder()
            .delete()
            .where('id IN (:...ids)', { ids: test_user_ids })
            .execute();
        deleted_users = deleted_users_result.affected || 0;

        return {
            message: 'Test data cleared successfully',
            deleted: {
                users: deleted_users,
                tweets: deleted_tweets,
                follows: deleted_follows,
                likes: deleted_likes,
                replies: deleted_replies,
            },
        };
    }

    async uploadAvatar(
        user_identifier: string,
        file: Express.Multer.File
    ): Promise<UploadFileResponseDto> {
        if (!file || !file.buffer) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_NOT_FOUND);
        }
        try {
            const image_name = this.azure_storage_service.generateFileName(
                user_identifier,
                encodeURIComponent(file.originalname)
            );

            const container_name = this.config_service.get<string>(
                'AZURE_STORAGE_PROFILE_IMAGE_CONTAINER'
            );

            const image_url = await this.azure_storage_service.uploadFile(
                file.buffer,
                image_name,
                container_name
            );

            return {
                image_url,
                image_name,
            };
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FILE_UPLOAD_FAILED);
        }
    }
}
