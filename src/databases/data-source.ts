import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { Verification } from '../verification/entities/verification.entity';
import { Category } from '../category/entities';
import {
    Tweet,
    TweetLike,
    TweetQuote,
    TweetReply,
    TweetRepost,
    TweetSummary,
} from '../tweets/entities';
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

// Determine if SSH tunnel should be used
const use_ssh_tunnel = process.env.USE_SSH_TUNNEL === 'true';

// For SSH tunnel, use localhost and the tunnel port
// Otherwise, use the actual database host and port
let db_host: string;
let db_port: number;

if (use_ssh_tunnel) {
    db_host = '127.0.0.1';
    db_port = 15432; // Local tunnel port
} else {
    db_host = (process.env.POSTGRES_HOST || config_service.get<string>('POSTGRES_HOST')) as string;
    db_port =
        parseInt(process.env.POSTGRES_PORT || '5432') ||
        config_service.get<number>('POSTGRES_PORT') ||
        5432;
}

const base_config: any = {
    type: 'postgres',
    host: db_host,
    username: process.env.POSTGRES_USERNAME || config_service.get<string>('POSTGRES_USERNAME'),
    password: process.env.POSTGRES_PASSWORD || config_service.get<string>('POSTGRES_PASSWORD'),
    database: process.env.POSTGRES_DB || config_service.get<string>('POSTGRES_DB'),
    port: db_port,

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
        TweetSummary,
    ],

    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    uuidExtension: 'pgcrypto',
};

if (process.env.DATABASE_CA) {
    base_config.ssl = {
        ca: readFileSync(process.env.DATABASE_CA).toString(),
    };
} else if (use_ssh_tunnel) {
    // Enable SSL with reject unauthorized for SSH tunnel connections
    base_config.ssl = {
        rejectUnauthorized: false,
    };
} else if (process.env.PGSSLMODE === 'require') {
    // Enable SSL for databases that require it (like DigitalOcean)
    base_config.ssl = {
        rejectUnauthorized: false,
    };
}

export default new DataSource(base_config);
