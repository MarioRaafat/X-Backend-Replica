import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ELASTICSEARCH_INDICES, INDEX_CONFIGS } from '../elasticsearch/schemas';

@Injectable()
export class ElasticsearchSetupService {
    private readonly logger = new Logger(ElasticsearchSetupService.name);

    constructor(private readonly elasticsearch_service: ElasticsearchService) {}

    async setupIndices() {
        try {
            for (const [index_name, index_config] of Object.entries(INDEX_CONFIGS)) {
                await this.createIndexIfNotExists(index_name, index_config);
            }
            this.logger.log('All Elasticsearch indices are ready');
        } catch (error) {
            this.logger.error('Failed to setup Elasticsearch indices', error);
        }
    }

    private async createIndexIfNotExists(index_name: string, config: any) {
        try {
            const exists = await this.elasticsearch_service.indices.exists({
                index: index_name,
            });

            if (!exists) {
                await this.elasticsearch_service.indices.create({
                    index: index_name,
                    body: config,
                });
                this.logger.log(`Created index: ${index_name}`);
            } else {
                this.logger.log(`Index already exists: ${index_name}`);
                await this.updateMappings(index_name, config.mappings);
            }
        } catch (error) {
            this.logger.error(`Failed to create index ${index_name}`, error);
            throw error;
        }
    }

    private async updateMappings(index_name: string, mappings: any) {
        try {
            await this.elasticsearch_service.indices.putMapping({
                index: index_name,
                body: mappings,
            });
            this.logger.log(`Updated mappings for index: ${index_name}`);
        } catch (error) {
            this.logger.warn(`Failed to update mappings for ${index_name}`, error);
        }
    }

    async resetIndices() {
        for (const index_name of Object.values(ELASTICSEARCH_INDICES)) {
            try {
                const exists = await this.elasticsearch_service.indices.exists({
                    index: index_name,
                });

                if (exists) {
                    await this.elasticsearch_service.indices.delete({
                        index: index_name,
                    });
                    this.logger.log(`Deleted index: ${index_name}`);
                }
            } catch (error) {
                this.logger.error(`Failed to delete index ${index_name}`, error);
            }
        }

        await this.setupIndices();
    }
}
