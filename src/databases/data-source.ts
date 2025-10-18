import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { Verification } from '../verification/entities/verification.entity';

const configService = new ConfigService();

export default new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || configService.get<string>('POSTGRES_HOST'),
    username: process.env.POSTGRES_USERNAME || configService.get<string>('POSTGRES_USERNAME'),
    password: process.env.POSTGRES_PASSWORD || configService.get<string>('POSTGRES_PASSWORD'),
    database: process.env.POSTGRES_DB || configService.get<string>('POSTGRES_DB'),
    port:
        parseInt(process.env.POSTGRES_PORT || '5432') ||
        configService.get<number>('POSTGRES_PORT') ||
        5432,
    entities: [User, Verification],
    migrations: ['src/migrations/*{.ts,.js}'],
    synchronize: false,
});
