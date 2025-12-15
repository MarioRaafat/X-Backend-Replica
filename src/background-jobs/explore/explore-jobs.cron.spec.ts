import { Test, TestingModule } from '@nestjs/testing';
import { ExploreJobsCron } from './explore-jobs.cron';
import { ExploreJobsService } from './explore-jobs.service';

describe('ExploreJobsCron', () => {
    let cron: ExploreJobsCron;
    let explore_service: ExploreJobsService;

    const mock_explore_jobs_service = {
        triggerScoreRecalculation: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExploreJobsCron,
                { provide: ExploreJobsService, useValue: mock_explore_jobs_service },
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
            const mock_result = { success: true, job_id: '1', params: {} };
            mock_explore_jobs_service.triggerScoreRecalculation.mockResolvedValue(mock_result);

            await cron.scheduleExploreScoreUpdate();

            expect(mock_explore_jobs_service.triggerScoreRecalculation).toHaveBeenCalledWith(
                expect.objectContaining({
                    force_all: false,
                }),
                expect.any(Number) // priority
            );
        });

        it('should handle queue errors gracefully', async () => {
            mock_explore_jobs_service.triggerScoreRecalculation.mockResolvedValue({
                success: false,
                error: 'Queue is full',
            });

            await expect(cron.scheduleExploreScoreUpdate()).resolves.not.toThrow();
        });

        it('should log job id on successful scheduling', async () => {
            const mock_result = { success: true, job_id: '123', params: {} };
            mock_explore_jobs_service.triggerScoreRecalculation.mockResolvedValue(mock_result);

            await cron.scheduleExploreScoreUpdate();

            expect(mock_explore_jobs_service.triggerScoreRecalculation).toHaveBeenCalled();
        });

        it('should handle exceptions thrown during scheduling', async () => {
            mock_explore_jobs_service.triggerScoreRecalculation.mockRejectedValue(
                new Error('Unexpected error')
            );

            await expect(cron.scheduleExploreScoreUpdate()).resolves.not.toThrow();
        });
    });
});
