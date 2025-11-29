import { Module } from '@nestjs/common';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchSetupService } from './elasticsearch-setup.service';
import { UserSeederService } from './seeders/user-seeder.service';
import { UserModule } from 'src/user/user.module';
import { TweetSeederService } from './seeders/tweets-seeder.service';
import { TweetsModule } from 'src/tweets/tweets.module';

@Module({
    imports: [
        ConfigModule,
        UserModule,
        TweetsModule,
        NestElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config_service: ConfigService) => ({
                node: config_service.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [ElasticsearchSetupService, UserSeederService, TweetSeederService],
    exports: [
        NestElasticsearchModule,
        ElasticsearchSetupService,
        UserSeederService,
        TweetSeederService,
    ],
})
export class ElasticsearchModule {}
