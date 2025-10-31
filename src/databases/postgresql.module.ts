import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config_service: ConfigService) => {
                const db_url = config_service.get<string>('DB_URL');

                if (!db_url) {
                    throw new Error('DB_URL environment variable is not defined');
                }

                const url = new URL(db_url);

                return {
                    type: 'postgres',
                    host: url.hostname,
                    port: parseInt(url.port) || 5432,
                    username: decodeURIComponent(url.username),
                    password: decodeURIComponent(url.password),
                    database: url.pathname.slice(1),
                    synchronize: false,
                    autoLoadEntities: true,
                    logging: true,
                    ssl: {
                        rejectUnauthorized: false,
                    },
                };
            },
        }),
    ],
    providers: [ConfigService],
})
export class PostgreSQLModule {}
