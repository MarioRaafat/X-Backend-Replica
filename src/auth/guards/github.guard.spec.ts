import { Test, TestingModule } from '@nestjs/testing';
import { GitHubAuthGuard } from './github.guard';

describe('GitHubAuthGuard', () => {
    let guard: GitHubAuthGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GitHubAuthGuard],
        }).compile();

        guard = module.get<GitHubAuthGuard>(GitHubAuthGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should extend AuthGuard with github strategy', () => {
        expect(guard).toBeInstanceOf(GitHubAuthGuard);
    });
});
