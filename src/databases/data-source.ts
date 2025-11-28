import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { Verification } from '../verification/entities/verification.entity';
import { Category } from '../category/entities';
import { Tweet, TweetLike, TweetQuote, TweetReply, TweetRepost } from '../tweets/entities';
import { TweetBookmark } from '../tweets/entities/tweet-bookmark.entity';
import { Hashtag } from '../tweets/entities/hashtags.entity';
import { UserPostsView } from '../tweets/entities/user-posts-view.entity';
import { UserBlocks, UserFollows, UserMutes } from '../user/entities';
import { UserInterests } from '../user/entities/user-interests.entity';
import { TweetCategory } from '../tweets/entities/tweet-category.entity';
import { Chat } from '../chat/entities/chat.entity';
import { Message } from '../messages/entities/message.entity';
import { readFileSync } from 'fs';
config({ path: resolve(__dirname, '../../config/.env') });
const config_service = new ConfigService();

export default new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || config_service.get<string>('POSTGRES_HOST'),
    username: process.env.POSTGRES_USERNAME || config_service.get<string>('POSTGRES_USERNAME'),
    password: process.env.POSTGRES_PASSWORD || config_service.get<string>('POSTGRES_PASSWORD'),
    database: process.env.POSTGRES_DB || config_service.get<string>('POSTGRES_DB'),
    port:
        parseInt(process.env.POSTGRES_PORT || '5432') ||
        config_service.get<number>('POSTGRES_PORT') ||
        5432,
    entities: [
        User,
        Verification,
        Tweet,
        TweetLike,
        TweetReply,
        TweetQuote,
        TweetBookmark,
        Category,
        TweetRepost,
        Hashtag,
        UserBlocks,
        UserFollows,
        UserInterests,
        UserMutes,
        UserPostsView,
        TweetCategory,
        Chat,
        Message,
    ],
    ssl: {
        ca: readFileSync(process.env.DATABASE_CA!).toString(), // Path to the CA certificate
    },
    migrations: ['src/migrations/*{.ts,.js}'],
    synchronize: false,
    uuidExtension: 'pgcrypto',
});
