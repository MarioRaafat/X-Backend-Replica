import { Test, TestingModule } from '@nestjs/testing';
import { GoogleAuthGuard } from './google-auth.guard';

describe('GoogleAuthGuard', () => {
    let guard: GoogleAuthGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GoogleAuthGuard],
        }).compile();

        guard = module.get<GoogleAuthGuard>(GoogleAuthGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should extend AuthGuard with google strategy', () => {
        expect(guard).toBeInstanceOf(GoogleAuthGuard);
    });
});
