import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let config_service: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-secret'),
                    },
                },
            ],
        }).compile();

        strategy = module.get<JwtStrategy>(JwtStrategy);
        config_service = module.get(ConfigService);
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('validate', () => {
        it('should return the payload', () => {
            const payload = { id: '123', email: 'test@example.com' };

            const result = strategy.validate(payload);

            expect(result).toEqual(payload);
        });

        it('should return payload with any structure', () => {
            const payload = {
                id: '456',
                username: 'testuser',
                roles: ['user', 'admin'],
            };

            const result = strategy.validate(payload);

            expect(result).toEqual(payload);
        });

        it('should handle empty payload', () => {
            const payload = {};

            const result = strategy.validate(payload);

            expect(result).toEqual(payload);
        });
    });
});
