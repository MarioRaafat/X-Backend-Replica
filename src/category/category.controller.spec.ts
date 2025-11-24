import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('CategoryController', () => {
    let controller: CategoryController;
    let category_service: jest.Mocked<CategoryService>;

    const mock_categories = ['Technology', 'Sports', 'Entertainment'];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CategoryController],
            providers: [
                {
                    provide: CategoryService,
                    useValue: {
                        getCategories: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<CategoryController>(CategoryController);
        category_service = module.get(CategoryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getCategories', () => {
        it('should return array of category names', async () => {
            category_service.getCategories.mockResolvedValue(mock_categories);

            const result = await controller.getCategories();

            expect(category_service.getCategories).toHaveBeenCalled();
            expect(result).toEqual(mock_categories);
            expect(result).toHaveLength(3);
        });

        it('should return empty array if no categories exist', async () => {
            category_service.getCategories.mockResolvedValue([]);

            const result = await controller.getCategories();

            expect(category_service.getCategories).toHaveBeenCalled();
            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should propagate InternalServerErrorException from service', async () => {
            category_service.getCategories.mockRejectedValue(
                new InternalServerErrorException('Failed to fetch data from database')
            );

            await expect(controller.getCategories()).rejects.toThrow(InternalServerErrorException);
            await expect(controller.getCategories()).rejects.toThrow(
                'Failed to fetch data from database'
            );
        });

        it('should call service getCategories method once', async () => {
            category_service.getCategories.mockResolvedValue(mock_categories);

            await controller.getCategories();

            expect(category_service.getCategories).toHaveBeenCalledTimes(1);
        });

        it('should return string array type', async () => {
            category_service.getCategories.mockResolvedValue(mock_categories);

            const result = await controller.getCategories();

            expect(Array.isArray(result)).toBe(true);
            expect(result.every((item) => typeof item === 'string')).toBe(true);
        });
    });
});
