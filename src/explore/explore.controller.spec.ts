import { Test, TestingModule } from '@nestjs/testing';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

describe('ExploreController', () => {
    let controller: ExploreController;
    let service: ExploreService;

    beforeEach(async () => {
        const mock_explore_service = {
            getExploreData: jest.fn(),
            getTrending: jest.fn(),
            getWhoToFollow: jest.fn(),
            getCategoryTrending: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ExploreController],
            providers: [
                {
                    provide: ExploreService,
                    useValue: mock_explore_service,
                },
            ],
        }).compile();

        controller = module.get<ExploreController>(ExploreController);
        service = module.get<ExploreService>(ExploreService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
        expect(service).toBeDefined();
    });

    describe('getExploreData', () => {
        it('should call explore_service.getExploreData with user_id', async () => {
            const user_id = 'user-123';
            const expected_result = {
                trending: [],
                who_to_follow: [],
                for_you_posts: [],
            };
            const spy = jest.spyOn(service, 'getExploreData').mockResolvedValue(expected_result);

            const result = await controller.getExploreData(user_id);

            expect(spy).toHaveBeenCalledWith(user_id);
            expect(result).toEqual(expected_result);
        });
    });

<<<<<<< HEAD
    describe('getTrending', () => {
        it('should call explore_service.getTrending without parameters', async () => {
            const expected_result = [];
            const spy = jest.spyOn(service, 'getTrending').mockResolvedValue(expected_result);

            const result = await controller.getTrending();

            expect(spy).toHaveBeenCalledWith(undefined, undefined);
            expect(result).toEqual(expected_result);
        });

        it('should call explore_service.getTrending with category', async () => {
            const category = 'sports';
            const spy = jest.spyOn(service, 'getTrending').mockResolvedValue([]);

            await controller.getTrending(category);

            expect(spy).toHaveBeenCalledWith(category, undefined);
        });

        it('should call explore_service.getTrending with category and country', async () => {
            const category = 'sports';
            const country = 'US';
            const spy = jest.spyOn(service, 'getTrending').mockResolvedValue([]);

            await controller.getTrending(category, country);

            expect(spy).toHaveBeenCalledWith(category, country);
        });
    });

=======
>>>>>>> origin/dev
    describe('getWhoToFollow', () => {
        it('should call explore_service.getWhoToFollow', async () => {
            const expected_result = [];
            const spy = jest.spyOn(service, 'getWhoToFollow').mockResolvedValue(expected_result);

            const result = await controller.getWhoToFollow();

            expect(spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expected_result);
        });
    });

    describe('getCategoryWiseTrending', () => {
        it('should call explore_service.getCategoryTrending with correct parameters', async () => {
            const category_id = '21';
            const user_id = 'user-123';
            const page = 1;
            const limit = 20;
            const expected_result = {
                category: { id: 21, name: 'Sports' },
                tweets: [],
                pagination: { page: 1, hasMore: false },
            };
            const spy = jest
                .spyOn(service, 'getCategoryTrending')
                .mockResolvedValue(expected_result);

            const result = await controller.getCategoryWiseTrending(
                category_id,
                user_id,
                page,
                limit
            );

            expect(spy).toHaveBeenCalledWith(category_id, user_id, page, limit);
            expect(result).toEqual(expected_result);
        });

        it('should use default page and limit values', async () => {
            const category_id = '21';
            const user_id = 'user-123';
            const spy = jest.spyOn(service, 'getCategoryTrending').mockResolvedValue({
                category: null,
                tweets: [],
                pagination: { page: 1, hasMore: false },
            });

            await controller.getCategoryWiseTrending(category_id, user_id);

            expect(spy).toHaveBeenCalledWith(category_id, user_id, 1, 20);
        });
    });
});
