import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchModule } from 'src/elasticsearch/elasticsearch.module';
import { ElasticsearchSetupService } from 'src/elasticsearch/elasticsearch-setup.service';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [ElasticsearchModule, UserModule],
    controllers: [SearchController],
    providers: [SearchService, ElasticsearchSetupService],
})
export class SearchModule {}
