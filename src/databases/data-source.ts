import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { Verification } from '../verification/entities/verification.entity';
import { Category } from '../category/entities';
import { Tweet, TweetLike, TweetQuote, TweetReply, TweetRepost } from '../tweets/entities';
import { UserBlocks, UserFollows, UserMutes } from '../user/entities';
import { UserInterests } from '../user/entities/user-interests.entity';
config({ path: resolve(__dirname, '../../config/.env') });
const config_service = new ConfigService();

const db_url = process.env.DB_URL || config_service.get<string>('DB_URL');

if (!db_url) {
    throw new Error('DB_URL environment variable is not defined');
}

const url = new URL(db_url);

export default new DataSource({
    type: 'postgres',
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    entities: [
        User,
        Verification,
        Tweet,
        TweetLike,
        TweetReply,
        TweetQuote,
        Category,
        TweetRepost,
        UserBlocks,
        UserFollows,
        UserInterests,
        UserMutes,
    ],
    migrations: ['src/migrations/*{.ts,.js}'],
    synchronize: false,
    uuidExtension: 'pgcrypto',
});
