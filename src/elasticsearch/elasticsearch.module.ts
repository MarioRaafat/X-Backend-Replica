import { Module } from '@nestjs/common';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchSetupService } from './elasticsearch-setup.service';
import { TweetSeederService } from './seeders/tweets-seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Tweet } from 'src/tweets/entities/tweet.entity';

@Module({
    imports: [
        ConfigModule,
        NestElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config_service: ConfigService) => ({
                node: config_service.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
                auth: {
                    username: config_service.get('ELASTICSEARCH_USERNAME') || 'elastic',
                    password: config_service.get('ELASTICSEARCH_PASSWORD') || 'dummy_password',
                },
                tls: {
                    rejectUnauthorized: false,
                },
            }),
            inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User]),
        TypeOrmModule.forFeature([Tweet]),
    ],
    providers: [ElasticsearchSetupService, TweetSeederService],
    exports: [NestElasticsearchModule, ElasticsearchSetupService, TweetSeederService],
})
export class ElasticsearchModule {}
