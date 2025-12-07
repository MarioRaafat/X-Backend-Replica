import { Test, TestingModule } from '@nestjs/testing';
import { ExploreController } from './explore-jobs.controller';
import { ExploreJobsService } from './explore-jobs.service';

describe('ExploreController', () => {
    let controller: ExploreController;
    let service: ExploreJobsService;

    beforeEach(async () => {
        const mock_explore_jobs_service = {
            triggerExploreScoreRecalculation: jest.fn(),
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
        service = module.get<ExploreJobsService>(ExploreJobsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
        expect(service).toBeDefined();
    });

    describe('triggerExploreUpdate', () => {
        it('should trigger explore score recalculation', async () => {
            const trigger_spy = jest
                .spyOn(service, 'triggerExploreScoreRecalculation')
                .mockResolvedValue(undefined);

            const result = await controller.triggerExploreUpdate();

            expect(trigger_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                success: true,
                message: 'Explore score recalculation triggered successfully',
            });
        });
    });

    describe('getExploreStatus', () => {
        it('should return explore job status', async () => {
            const result = await controller.getExploreStatus();

            expect(result).toEqual({
                status: 'active',
                message: 'Explore jobs are running',
            });
        });
    });
});
