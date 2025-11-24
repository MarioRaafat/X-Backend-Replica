import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { Repository } from 'typeorm';
import { Category } from './entities';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';

describe('CategoryService', () => {
    let service: CategoryService;
    let category_repository: jest.Mocked<Repository<Category>>;

    const mock_categories = [
        { id: '1', name: 'Technology' },
        { id: '2', name: 'Sports' },
        { id: '3', name: 'Entertainment' },
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CategoryService,
                {
                    provide: getRepositoryToken(Category),
                    useValue: {
                        find: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CategoryService>(CategoryService);
        category_repository = module.get(getRepositoryToken(Category));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getCategories', () => {
        it('should return array of category names', async () => {
            category_repository.find.mockResolvedValue(mock_categories as any);

            const result = await service.getCategories();

            expect(category_repository.find).toHaveBeenCalled();
            expect(result).toEqual(['Technology', 'Sports', 'Entertainment']);
            expect(result).toHaveLength(3);
        });

        it('should return empty array if no categories exist', async () => {
            category_repository.find.mockResolvedValue([]);

            const result = await service.getCategories();

            expect(category_repository.find).toHaveBeenCalled();
            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should throw InternalServerErrorException if database query fails', async () => {
            category_repository.find.mockRejectedValue(new Error('Database error'));

            await expect(service.getCategories()).rejects.toThrow(InternalServerErrorException);
            await expect(service.getCategories()).rejects.toThrow(
                'Failed to fetch data from database'
            );
        });

        it('should only return category names, not full objects', async () => {
            category_repository.find.mockResolvedValue(mock_categories as any);

            const result = await service.getCategories();

            expect(result.every((item) => typeof item === 'string')).toBe(true);
            expect(result[0]).toBe('Technology');
            expect(result[1]).toBe('Sports');
            expect(result[2]).toBe('Entertainment');
        });
    });
});
