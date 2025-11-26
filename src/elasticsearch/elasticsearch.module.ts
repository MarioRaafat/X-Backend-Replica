import { Module } from '@nestjs/common';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchSetupService } from './elasticsearch-setup.service';
import { UserSeederService } from './seeders/user-seeder.service';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        ConfigModule,
        UserModule,
        NestElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config_service: ConfigService) => ({
                node: config_service.get('ELASTICSEARCH_NODE'),
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [ElasticsearchSetupService, UserSeederService],
    exports: [NestElasticsearchModule, ElasticsearchSetupService, UserSeederService],
})
export class ElasticsearchModule {}
