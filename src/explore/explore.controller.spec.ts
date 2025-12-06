import { Test, TestingModule } from '@nestjs/testing';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

describe('ExploreController', () => {
    let controller: ExploreController;
    let service: ExploreService;

    beforeEach(async () => {
        const mock_explore_service = {
            root: jest.fn(),
            getExploreItems: jest.fn(),
            getWhoToFollow: jest.fn(),
            getForYouPosts: jest.fn(),
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

    describe('root', () => {
        it('should call explore_service.root', async () => {
            const expected_result = { message: 'Explore endpoint' };
            const root_spy = jest.spyOn(service, 'root').mockResolvedValue(expected_result);

            const result = await controller.root();

            expect(root_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expected_result);
        });

        it('should return the result from service', async () => {
            const mock_data = { message: 'Test message' };
            const root_spy = jest.spyOn(service, 'root').mockResolvedValue(mock_data);

            const result = await controller.root();

            expect(result).toBe(mock_data);
        });
    });

    describe('getExploreItems', () => {
        it('should call explore_service.getExploreItems without parameters', async () => {
            const trending_spy = jest
                .spyOn(service, 'getExploreItems')
                .mockResolvedValue(undefined);

            await controller.getExploreItems();

            expect(trending_spy).toHaveBeenCalledWith(undefined, undefined);
            expect(trending_spy).toHaveBeenCalledTimes(1);
        });

        it('should call explore_service.getExploreItems with category', async () => {
            const category = 'technology';
            const trending_spy = jest
                .spyOn(service, 'getExploreItems')
                .mockResolvedValue(undefined);

            await controller.getExploreItems(category);

            expect(trending_spy).toHaveBeenCalledWith(category, undefined);
        });

        it('should call explore_service.getExploreItems with category and country', async () => {
            const category = 'sports';
            const country = 'US';
            const trending_spy = jest
                .spyOn(service, 'getExploreItems')
                .mockResolvedValue(undefined);

            await controller.getExploreItems(category, country);

            expect(trending_spy).toHaveBeenCalledWith(category, country);
        });

        it('should return the result from service', async () => {
            const mock_trending = [{ id: 1, name: 'Topic 1' }];
            const trending_spy = jest
                .spyOn(service, 'getExploreItems')
                .mockResolvedValue(mock_trending as any);

            const result = await controller.getExploreItems('tech');

            expect(result).toBe(mock_trending);
        });
    });

    describe('getWhoToFollow', () => {
        it('should call explore_service.getWhoToFollow', async () => {
            const follow_spy = jest.spyOn(service, 'getWhoToFollow').mockResolvedValue(undefined);

            await controller.getWhoToFollow();

            expect(follow_spy).toHaveBeenCalledTimes(1);
            expect(follow_spy).toHaveBeenCalledWith();
        });

        it('should return the result from service', async () => {
            const mock_users = [{ id: '1', username: 'user1' }];
            const follow_spy = jest
                .spyOn(service, 'getWhoToFollow')
                .mockResolvedValue(mock_users as any);

            const result = await controller.getWhoToFollow();

            expect(result).toBe(mock_users);
        });
    });

    describe('getForYouPosts', () => {
        it('should call explore_service.getForYouPosts without category', async () => {
            const posts_spy = jest.spyOn(service, 'getForYouPosts').mockResolvedValue(undefined);

            await controller.getForYouPosts();

            expect(posts_spy).toHaveBeenCalledWith(undefined);
            expect(posts_spy).toHaveBeenCalledTimes(1);
        });

        it('should call explore_service.getForYouPosts with category', async () => {
            const category = 'news';
            const posts_spy = jest.spyOn(service, 'getForYouPosts').mockResolvedValue(undefined);

            await controller.getForYouPosts(category);

            expect(posts_spy).toHaveBeenCalledWith(category);
        });

        it('should return the result from service', async () => {
            const mock_posts = [{ id: '1', content: 'Post 1' }];
            const posts_spy = jest
                .spyOn(service, 'getForYouPosts')
                .mockResolvedValue(mock_posts as any);

            const result = await controller.getForYouPosts('sports');

            expect(result).toBe(mock_posts);
        });

        it('should handle empty category string', async () => {
            const posts_spy = jest.spyOn(service, 'getForYouPosts').mockResolvedValue(undefined);

            await controller.getForYouPosts('');

            expect(posts_spy).toHaveBeenCalledWith('');
        });
    });
});
