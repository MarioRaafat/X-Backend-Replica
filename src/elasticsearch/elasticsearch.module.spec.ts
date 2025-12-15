import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchModule } from './elasticsearch.module';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchSetupService } from './elasticsearch-setup.service';
import { TweetSeederService } from './seeders/tweets-seeder.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Tweet } from 'src/tweets/entities/tweet.entity';

describe('ElasticsearchModule', () => {
    let module: TestingModule;

    const mock_repository = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [ElasticsearchModule],
        })
            .overrideProvider(ConfigService)
            .useValue({
                get: jest.fn((key: string) => {
                    const config = {
                        ELASTICSEARCH_NODE: 'http://test-node:9200',
                        ELASTICSEARCH_USERNAME: 'test-user',
                        ELASTICSEARCH_PASSWORD: 'test-password',
                    };
                    return config[key];
                }),
            })
            .overrideProvider(getRepositoryToken(User))
            .useValue(mock_repository)
            .overrideProvider(getRepositoryToken(Tweet))
            .useValue(mock_repository)
            .overrideProvider(ElasticsearchSetupService)
            .useValue({
                setupIndices: jest.fn(),
                createIndex: jest.fn(),
            })
            .overrideProvider(TweetSeederService)
            .useValue({
                seed: jest.fn(),
            })
            .compile();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should have ElasticsearchSetupService', () => {
        const service = module.get<ElasticsearchSetupService>(ElasticsearchSetupService);
        expect(service).toBeDefined();
    });

    it('should have TweetSeederService', () => {
        const service = module.get<TweetSeederService>(TweetSeederService);
        expect(service).toBeDefined();
    });

    it('should export NestElasticsearchModule', () => {
        const exports = Reflect.getMetadata('exports', ElasticsearchModule);
        expect(exports).toContain(NestElasticsearchModule);
    });

    it('should export ElasticsearchSetupService', () => {
        const exports = Reflect.getMetadata('exports', ElasticsearchModule);
        expect(exports).toContain(ElasticsearchSetupService);
    });

    it('should export TweetSeederService', () => {
        const exports = Reflect.getMetadata('exports', ElasticsearchModule);
        expect(exports).toContain(TweetSeederService);
    });

    it('should import ConfigModule', () => {
        const imports = Reflect.getMetadata('imports', ElasticsearchModule);
        expect(imports).toContain(ConfigModule);
    });

    it('should have User repository available', () => {
        const repository = module.get(getRepositoryToken(User));
        expect(repository).toBeDefined();
    });

    it('should have Tweet repository available', () => {
        const repository = module.get(getRepositoryToken(Tweet));
        expect(repository).toBeDefined();
    });
});

describe('ElasticsearchModule - Configuration', () => {
    it('should configure with default values when env vars not set', () => {
        const mock_config_service = {
            get: jest.fn().mockReturnValue(undefined),
        };

        const config = {
            node: mock_config_service.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
            auth: {
                username: mock_config_service.get('ELASTICSEARCH_USERNAME') || 'elastic',
                password: mock_config_service.get('ELASTICSEARCH_PASSWORD') || 'dummy_password',
            },
            tls: {
                rejectUnauthorized: false,
            },
        };

        expect(config.node).toBe('http://localhost:9200');
        expect(config.auth.username).toBe('elastic');
        expect(config.auth.password).toBe('dummy_password');
        expect(mock_config_service.get).toHaveBeenCalledWith('ELASTICSEARCH_NODE');
        expect(mock_config_service.get).toHaveBeenCalledWith('ELASTICSEARCH_USERNAME');
        expect(mock_config_service.get).toHaveBeenCalledWith('ELASTICSEARCH_PASSWORD');
    });

    it('should use custom configuration when provided', () => {
        const mock_config_service = {
            get: jest.fn((key: string) => {
                const config = {
                    ELASTICSEARCH_NODE: 'http://custom:9200',
                    ELASTICSEARCH_USERNAME: 'custom-user',
                    ELASTICSEARCH_PASSWORD: 'custom-pass',
                };
                return config[key];
            }),
        };

        const config = {
            node: mock_config_service.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
            auth: {
                username: mock_config_service.get('ELASTICSEARCH_USERNAME') || 'elastic',
                password: mock_config_service.get('ELASTICSEARCH_PASSWORD') || 'dummy_password',
            },
            tls: {
                rejectUnauthorized: false,
            },
        };

        expect(config.node).toBe('http://custom:9200');
        expect(config.auth.username).toBe('custom-user');
        expect(config.auth.password).toBe('custom-pass');
        expect(mock_config_service.get).toHaveBeenCalledWith('ELASTICSEARCH_NODE');
        expect(mock_config_service.get).toHaveBeenCalledWith('ELASTICSEARCH_USERNAME');
        expect(mock_config_service.get).toHaveBeenCalledWith('ELASTICSEARCH_PASSWORD');
    });

    it('should set TLS rejectUnauthorized to false', () => {
        const mock_config_service = {
            get: jest.fn().mockReturnValue(undefined),
        };

        const config = {
            node: mock_config_service.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
            auth: {
                username: mock_config_service.get('ELASTICSEARCH_USERNAME') || 'elastic',
                password: mock_config_service.get('ELASTICSEARCH_PASSWORD') || 'dummy_password',
            },
            tls: {
                rejectUnauthorized: false,
            },
        };

        expect(config.tls.rejectUnauthorized).toBe(false);
    });
});
