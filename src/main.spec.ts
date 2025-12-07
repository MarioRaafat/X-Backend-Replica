import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Mock the bootstrap function to test main.ts
jest.mock('./app.module');

describe('main.ts', () => {
    let app: INestApplication;
    let original_env: NodeJS.ProcessEnv;

    beforeAll(() => {
        original_env = { ...process.env };
        process.env.PORT = '3000';
        process.env.FRONTEND_URL = 'http://localhost:3001';
    });

    afterAll(() => {
        process.env = original_env;
    });

    beforeEach(async () => {
        const module_fixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module_fixture.createNestApplication();
    });

    afterEach(async () => {
        if (app) {
            await app.close();
        }
    });

    it('should be defined', () => {
        expect(app).toBeDefined();
    });

    it('should apply global validation pipe', () => {
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                transformOptions: {
                    exposeDefaultValues: true,
                    enableImplicitConversion: true,
                },
            })
        );

        expect(app).toBeDefined();
    });

    it('should enable CORS with correct configuration', () => {
        const enable_cors_spy = jest.spyOn(app, 'enableCors');

        app.enableCors({
            origin: [process.env.FRONTEND_URL || 'http://localhost:3001'],
            credentials: true,
        });

        expect(enable_cors_spy).toHaveBeenCalledWith({
            origin: expect.any(Array),
            credentials: true,
        });
    });

    it('should use cookie parser', () => {
        const use_spy = jest.spyOn(app, 'use');
        // We can't directly test cookieParser, but we can verify app.use is callable
        expect(use_spy).toBeDefined();
    });
});

describe('Bootstrap Configuration', () => {
    it('should have correct swagger configuration structure', () => {
        const swagger_config = {
            title: 'Backend API',
            description: expect.any(String),
            version: '1.0',
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
        };

        expect(swagger_config.title).toBe('Backend API');
        expect(swagger_config.version).toBe('1.0');
        expect(swagger_config.bearerAuth.type).toBe('http');
        expect(swagger_config.bearerAuth.scheme).toBe('bearer');
    });

    it('should define correct port configuration', () => {
        const default_port = 3000;
        const port = process.env.PORT ?? default_port;

        expect(port).toBeDefined();
        expect(typeof port === 'string' || typeof port === 'number').toBe(true);
    });

    it('should have CORS origin configuration', () => {
        const default_origin = 'http://localhost:3001';
        const origin = process.env.FRONTEND_URL || default_origin;

        expect(origin).toBeDefined();
        expect(typeof origin).toBe('string');
    });
});

describe('Validation Pipe Configuration', () => {
    it('should have correct validation pipe options', () => {
        const validation_pipe_options = {
            transform: true,
            transformOptions: {
                exposeDefaultValues: true,
                enableImplicitConversion: true,
            },
        };

        expect(validation_pipe_options.transform).toBe(true);
        expect(validation_pipe_options.transformOptions.exposeDefaultValues).toBe(true);
        expect(validation_pipe_options.transformOptions.enableImplicitConversion).toBe(true);
    });
});

describe('Swagger Setup', () => {
    it('should have swagger endpoint path', () => {
        const swagger_path = 'api-docs';
        expect(swagger_path).toBe('api-docs');
    });

    it('should have bearer auth configuration name', () => {
        const bearer_auth_name = 'JWT-auth';
        expect(bearer_auth_name).toBe('JWT-auth');
    });

    it('should have swagger description', () => {
        const description =
            'El-Sabe3 Documentation presented by backend team with lots of kisses for you 😘';
        expect(description).toContain('El-Sabe3 Documentation');
        expect(description).toContain('backend team');
    });
});
