import { Test, TestingModule } from '@nestjs/testing';
import { FacebookAuthGuard } from './facebook.guard';

describe('FacebookAuthGuard', () => {
    let guard: FacebookAuthGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FacebookAuthGuard],
        }).compile();

        guard = module.get<FacebookAuthGuard>(FacebookAuthGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should extend AuthGuard with facebook strategy', () => {
        expect(guard).toBeInstanceOf(FacebookAuthGuard);
    });
});
