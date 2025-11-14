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
