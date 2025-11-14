import { CategorySeeder } from './category.seed';
import { ISeederContext } from './seeder.interface';
import { Category } from 'src/category/entities/category.entity';
import { DataSource, Repository } from 'typeorm';

describe('CategorySeeder', () => {
    let seeder: CategorySeeder;
    let mock_context: ISeederContext;
    let mock_data_source: jest.Mocked<DataSource>;
    let mock_repository: jest.Mocked<Repository<Category>>;

    beforeEach(() => {
        seeder = new CategorySeeder();

        mock_repository = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        } as any;

        mock_data_source = {
            getRepository: jest.fn().mockReturnValue(mock_repository),
        } as any;

        mock_context = {
            data_source: mock_data_source,
            topic_name: 'test-topic',
            data: {
                users: [],
                tweets: [],
                replies: [],
            },
            results: {},
        };
    });

    it('should be defined', () => {
        expect(seeder).toBeDefined();
    });

    it('should return correct name', () => {
        expect(seeder.getName()).toBe('CategorySeeder');
    });

    it('should seed all categories successfully', async () => {
        mock_repository.findOne.mockResolvedValue(null);
        mock_repository.create.mockImplementation((data) => data as Category);
        mock_repository.save.mockImplementation((data) => Promise.resolve(data as Category));

        await seeder.seed(mock_context);

        expect(mock_data_source.getRepository).toHaveBeenCalledWith(Category);
        expect(mock_repository.findOne).toHaveBeenCalled();
        expect(mock_repository.create).toHaveBeenCalled();
        expect(mock_repository.save).toHaveBeenCalled();
        expect(mock_context.results?.categories).toBeDefined();
    });

    it('should skip existing categories', async () => {
        const existing_category = { id: 1, name: 'news' } as Category;
        mock_repository.findOne.mockResolvedValue(existing_category);

        await seeder.seed(mock_context);

        expect(mock_repository.findOne).toHaveBeenCalled();
        expect(mock_repository.save).not.toHaveBeenCalled();
    });

    it('should handle unique constraint violations gracefully', async () => {
        mock_repository.findOne.mockResolvedValue(null);
        mock_repository.create.mockImplementation((data) => data as Category);
        mock_repository.save.mockRejectedValue({ code: '23505' });

        await expect(seeder.seed(mock_context)).resolves.not.toThrow();
    });

    it('should rethrow non-unique constraint errors', async () => {
        mock_repository.findOne.mockResolvedValue(null);
        mock_repository.create.mockImplementation((data) => data as Category);
        mock_repository.save.mockRejectedValue(new Error('Database error'));

        await expect(seeder.seed(mock_context)).rejects.toThrow('Database error');
    });

    it('should store results in context', async () => {
        mock_repository.findOne.mockResolvedValue(null);
        const mock_category = { id: 1, name: 'sports' } as Category;
        mock_repository.create.mockImplementation((data) => data as Category);
        mock_repository.save.mockResolvedValue(mock_category);

        await seeder.seed(mock_context);

        expect(mock_context.results).toBeDefined();
        expect(mock_context.results?.categories).toBeDefined();
        expect(Array.isArray(mock_context.results?.categories)).toBe(true);
    });

    it('should seed multiple categories', async () => {
        mock_repository.findOne.mockResolvedValue(null);
        mock_repository.create.mockImplementation((data) => data as Category);
        mock_repository.save.mockImplementation((data) => Promise.resolve(data as Category));

        await seeder.seed(mock_context);

        expect(mock_repository.save).toHaveBeenCalled();
        expect(mock_context.results?.categories).toBeDefined();
    });
});
