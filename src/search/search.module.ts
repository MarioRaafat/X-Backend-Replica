import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchModule } from 'src/elasticsearch/elasticsearch.module';
import { ElasticsearchSetupService } from 'src/elasticsearch/elasticsearch-setup.service';

@Module({
    imports: [ElasticsearchModule],
    controllers: [SearchController],
    providers: [SearchService, ElasticsearchSetupService],
})
export class SearchModule {}
