import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchSetupService } from './elasticsearch-setup.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Logger } from '@nestjs/common';
import { ELASTICSEARCH_INDICES, INDEX_CONFIGS } from './schemas';

describe('ElasticsearchSetupService', () => {
    let service: ElasticsearchSetupService;
    let elasticsearch_service: jest.Mocked<ElasticsearchService>;

    const mock_elasticsearch_service = {
        indices: {
            exists: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            putMapping: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ElasticsearchSetupService,
                {
                    provide: ElasticsearchService,
                    useValue: mock_elasticsearch_service,
                },
            ],
        }).compile();

        service = module.get<ElasticsearchSetupService>(ElasticsearchSetupService);
        elasticsearch_service = module.get(ElasticsearchService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setupIndices', () => {
        it('should create all indices if they do not exist', async () => {
            mock_elasticsearch_service.indices.exists.mockResolvedValue(false);
            mock_elasticsearch_service.indices.create.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await service.setupIndices();

            const index_count = Object.keys(INDEX_CONFIGS).length;
            expect(mock_elasticsearch_service.indices.exists).toHaveBeenCalledTimes(index_count);
            expect(mock_elasticsearch_service.indices.create).toHaveBeenCalledTimes(index_count);
            expect(logger_spy).toHaveBeenCalledWith('All Elasticsearch indices are ready');
        });

        it('should update mappings if index already exists', async () => {
            mock_elasticsearch_service.indices.exists.mockResolvedValue(true);
            mock_elasticsearch_service.indices.putMapping.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await service.setupIndices();

            const index_count = Object.keys(INDEX_CONFIGS).length;
            expect(mock_elasticsearch_service.indices.exists).toHaveBeenCalledTimes(index_count);
            expect(mock_elasticsearch_service.indices.create).not.toHaveBeenCalled();
            expect(mock_elasticsearch_service.indices.putMapping).toHaveBeenCalledTimes(
                index_count
            );
        });

        it('should log error if setup fails', async () => {
            const error = new Error('Setup failed');
            mock_elasticsearch_service.indices.exists.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await service.setupIndices();

            expect(logger_spy).toHaveBeenCalledWith('Failed to setup Elasticsearch indices', error);
        });

        it('should handle index creation error gracefully', async () => {
            const error = new Error('Create failed');
            mock_elasticsearch_service.indices.exists.mockResolvedValue(false);
            mock_elasticsearch_service.indices.create.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await service.setupIndices();

            expect(logger_spy).toHaveBeenCalled();
        });
    });

    describe('resetIndices', () => {
        it('should delete existing indices and setup new ones', async () => {
            mock_elasticsearch_service.indices.exists.mockResolvedValue(true);
            mock_elasticsearch_service.indices.delete.mockResolvedValue({} as any);
            mock_elasticsearch_service.indices.create.mockResolvedValue({} as any);

            const logger_spy = jest.spyOn(Logger.prototype, 'log');

            await service.resetIndices();

            const indices_count = Object.values(ELASTICSEARCH_INDICES).length;
            expect(mock_elasticsearch_service.indices.delete).toHaveBeenCalledTimes(indices_count);
            expect(logger_spy).toHaveBeenCalledWith('All Elasticsearch indices are ready');
        });

        it('should skip deletion if index does not exist', async () => {
            mock_elasticsearch_service.indices.exists.mockResolvedValue(false);
            mock_elasticsearch_service.indices.create.mockResolvedValue({} as any);

            await service.resetIndices();

            expect(mock_elasticsearch_service.indices.delete).not.toHaveBeenCalled();
        });

        it('should log error if deletion fails', async () => {
            const error = new Error('Delete failed');
            mock_elasticsearch_service.indices.exists.mockResolvedValue(true);
            mock_elasticsearch_service.indices.delete.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'error');

            await service.resetIndices();

            expect(logger_spy).toHaveBeenCalled();
        });
    });

    describe('updateMappings', () => {
        it('should warn if mapping update fails', async () => {
            const error = new Error('Update failed');
            mock_elasticsearch_service.indices.exists.mockResolvedValue(true);
            mock_elasticsearch_service.indices.putMapping.mockRejectedValue(error);

            const logger_spy = jest.spyOn(Logger.prototype, 'warn');

            await service.setupIndices();

            expect(logger_spy).toHaveBeenCalled();
        });
    });
});
