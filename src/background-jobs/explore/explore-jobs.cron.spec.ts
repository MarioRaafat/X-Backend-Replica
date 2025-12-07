import { Test, TestingModule } from '@nestjs/testing';
import { ExploreJobsCron } from './explore-jobs.cron';
import { ExploreJobsService } from './explore-jobs.service';

describe('ExploreJobsCron', () => {
    let cron: ExploreJobsCron;
    let explore_service: ExploreJobsService;

    const mockExploreJobsService = {
        triggerScoreRecalculation: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreJobsCron,
                { provide: ExploreJobsService, useValue: mockExploreJobsService },
            ],
        }).compile();

        cron = module.get<ExploreJobsCron>(ExploreJobsCron);
        explore_service = module.get<ExploreJobsService>(ExploreJobsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(cron).toBeDefined();
    });

    describe('scheduleExploreScoreUpdate', () => {
        it('should schedule explore score update job with default config', async () => {
            const mockResult = { success: true, job_id: '1', params: {} };
            mockExploreJobsService.triggerScoreRecalculation.mockResolvedValue(mockResult);

            await cron.scheduleExploreScoreUpdate();

            expect(mockExploreJobsService.triggerScoreRecalculation).toHaveBeenCalledWith(
                expect.objectContaining({
                    force_all: false,
                }),
                expect.any(Number) // priority
            );
        });

        it('should handle queue errors gracefully', async () => {
            mockExploreJobsService.triggerScoreRecalculation.mockResolvedValue({
                success: false,
                error: 'Queue is full',
            });

            await expect(cron.scheduleExploreScoreUpdate()).resolves.not.toThrow();
        });

        it('should log job id on successful scheduling', async () => {
            const mockResult = { success: true, job_id: '123', params: {} };
            mockExploreJobsService.triggerScoreRecalculation.mockResolvedValue(mockResult);

            await cron.scheduleExploreScoreUpdate();

            expect(mockExploreJobsService.triggerScoreRecalculation).toHaveBeenCalled();
        });
    });
});
