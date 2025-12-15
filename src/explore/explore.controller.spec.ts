import { Test, TestingModule } from '@nestjs/testing';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

describe('ExploreController', () => {
    let controller: ExploreController;
    let service: ExploreService;

    beforeEach(async () => {
        const mock_explore_service = {
            getExploreData: jest.fn(),
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
                trending: { data: [] },
                who_to_follow: [],
                for_you: [],
            };
            const spy = jest
                .spyOn(service, 'getExploreData')
                .mockResolvedValue(expected_result as any);

            const result = await controller.getExploreData(user_id);

            expect(spy).toHaveBeenCalledWith(user_id);
            expect(result).toEqual(expected_result);
        });
    });

    describe('getWhoToFollow', () => {
        it('should call explore_service.getWhoToFollow', async () => {
            const user_id = 'user-123';
            const expected_result = [];
            const spy = jest.spyOn(service, 'getWhoToFollow').mockResolvedValue(expected_result);

            const result = await controller.getWhoToFollow(user_id);

            expect(spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expected_result);
        });
    });

    describe('getCategoryWiseTrending', () => {
        it('should call explore_service.getCategoryTrending with correct parameters', async () => {
            const category_id = '21';
            const user_id = 'user-123';
            const page = '1';
            const limit = '20';
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

            expect(spy).toHaveBeenCalledWith(category_id, user_id, 1, 20);
            expect(result).toEqual(expected_result);
        });

        it('should use default page and limit values', async () => {
            const category_id = '21';
            const user_id = 'user-123';
            const spy = jest.spyOn(service, 'getCategoryTrending').mockResolvedValue({
                category: null,
                tweets: [],
                page: 1,
                limit: 20,
                hasMore: false,
            } as any);

            await controller.getCategoryWiseTrending(category_id, user_id);

            expect(spy).toHaveBeenCalledWith(category_id, user_id, 1, 20);
        });

        it('should parse string page and limit to numbers', async () => {
            const category_id = '5';
            const user_id = 'user-456';
            const page = '3';
            const limit = '15';
            const spy = jest.spyOn(service, 'getCategoryTrending').mockResolvedValue({
                category: { id: 5, name: 'Technology' },
                tweets: [],
                pagination: { page: 3, hasMore: true },
            });

            await controller.getCategoryWiseTrending(category_id, user_id, page, limit);

            expect(spy).toHaveBeenCalledWith(category_id, user_id, 3, 15);
        });

        it('should work without user_id', async () => {
            const category_id = '10';
            const spy = jest.spyOn(service, 'getCategoryTrending').mockResolvedValue({
                category: { id: 10, name: 'Entertainment' },
                tweets: [],
                pagination: { page: 1, hasMore: false },
            } as any);

            await controller.getCategoryWiseTrending(category_id, '' as any);

            expect(spy).toHaveBeenCalledWith(category_id, '', 1, 20);
        });

        it('should handle custom page without limit', async () => {
            const category_id = '7';
            const user_id = 'user-789';
            const page = '2';
            const spy = jest.spyOn(service, 'getCategoryTrending').mockResolvedValue({
                category: { id: 7, name: 'Sports' },
                tweets: [],
                pagination: { page: 2, hasMore: false },
            });

            await controller.getCategoryWiseTrending(category_id, user_id, page);

            expect(spy).toHaveBeenCalledWith(category_id, user_id, 2, 20);
        });

        it('should handle custom limit without page', async () => {
            const category_id = '12';
            const user_id = 'user-101';
            const limit = '10';
            const spy = jest.spyOn(service, 'getCategoryTrending').mockResolvedValue({
                category: { id: 12, name: 'News' },
                tweets: [],
                pagination: { page: 1, hasMore: false },
            });

            await controller.getCategoryWiseTrending(category_id, user_id, undefined, limit);

            expect(spy).toHaveBeenCalledWith(category_id, user_id, 1, 10);
        });
    });
});
