import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config_service: ConfigService) => ({
                type: 'postgres',
                host: config_service.get<string>('POSTGRES_HOST'),
                username: config_service.get<string>('POSTGRES_USERNAME'),
                password: config_service.get<string>('POSTGRES_PASSWORD'),
                database: config_service.get<string>('POSTGRES_DB'),
                port: config_service.get<number>('POSTGRES_PORT'),
                synchronize: false, // Using migrations instead
                autoLoadEntities: true,
                logging: ['query'],
                logger: 'advanced-console',
            }),
        }),
    ],
    providers: [ConfigService],
})
export class PostgreSQLModule {}
