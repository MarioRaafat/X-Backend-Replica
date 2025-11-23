import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchSetupService } from 'src/elasticsearch/elasticsearch-setup.service';

@Module({
    imports: [
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (config_service: ConfigService) => ({
                node: config_service.get('ELASTICSEARCH_NODE'),
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [SearchController],
    providers: [SearchService, ElasticsearchSetupService],
})
export class SearchModule {}
