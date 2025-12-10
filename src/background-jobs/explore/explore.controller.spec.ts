import { Test, TestingModule } from '@nestjs/testing';
import { ExploreController } from './explore-jobs.controller';
import { ExploreJobsService } from './explore-jobs.service';

describe('ExploreController', () => {
    let controller: ExploreController;
    let explore_service: ExploreJobsService;

    beforeEach(async () => {
        const mock_explore_jobs_service = {
            triggerScoreRecalculation: jest.fn(),
            getQueueStats: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ExploreController],
            providers: [
                {
                    provide: ExploreJobsService,
                    useValue: mock_explore_jobs_service,
                },
            ],
        }).compile();

        controller = module.get<ExploreController>(ExploreController);
        explore_service = module.get<ExploreJobsService>(ExploreJobsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
        expect(explore_service).toBeDefined();
    });

    describe('triggerExploreUpdate', () => {
        it('should trigger explore score recalculation', async () => {
            const expected_result = {
                success: true,
                job_id: '123',
                params: {
                    since_hours: 24,
                    max_age_hours: 168,
                    batch_size: 500,
                    force_all: false,
                },
            };
            const trigger_spy = jest
                .spyOn(explore_service, 'triggerScoreRecalculation')
                .mockResolvedValue(expected_result);

            const result = await controller.triggerExploreUpdate();

            expect(trigger_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expected_result);
        });
    });

    describe('getExploreStatus', () => {
        it('should return explore job status with queue stats', async () => {
            const mock_stats = {
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3,
                total_jobs: 110,
            };
            jest.spyOn(explore_service, 'getQueueStats').mockResolvedValue(mock_stats);

            const result = await controller.getExploreStatus();

            expect(result).toEqual({
                status: 'active',
                message: 'Explore jobs are running',
                queue_stats: mock_stats,
            });
        });
    });
});
