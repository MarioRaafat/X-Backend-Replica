import { BaseSeeder, ISeederContext } from './seeder.interface';
import { Category } from 'src/category/entities/category.entity';

/**
 * Category Seeder
 * Seeds predefined categories into the database
 * This seeder is topic-independent and runs once per seed operation
 */
export class CategorySeeder extends BaseSeeder {
    private static readonly CATEGORIES = [
        'news',
        'sports',
        'music',
        'dance',
        'celebrity',
        'relationships',
        'movies_tv',
        'technology',
        'business_finance',
        'cryptocurrency',
        'career',
        'gaming',
        'health_fitness',
        'travel',
        'food',
        'beauty',
        'fashion',
        'nature_outdoors',
        'pets',
        'home_garden',
        'art',
        'anime',
        'memes',
        'education',
        'science',
        'religion',
        'shopping',
        'cars',
        'aviation',
        'motorcycles',
    ];

    getName(): string {
        return 'CategorySeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        const { data_source } = context;

        this.log(`Seeding ${CategorySeeder.CATEGORIES.length} categories`);

        const category_repository = data_source.getRepository(Category);

        const inserted_categories: Category[] = [];
        let skipped_count = 0;

        for (const category_name of CategorySeeder.CATEGORIES) {
            try {
                // Check if category already exists
                const existing = await category_repository.findOne({
                    where: { name: category_name },
                });

                if (existing) {
                    skipped_count++;
                    continue;
                }

                // Create and save new category
                const category = category_repository.create({ name: category_name });
                const saved = await category_repository.save(category);
                inserted_categories.push(saved);
            } catch (error) {
                // Handle unique constraint violations gracefully
                if (error.code === '23505') {
                    // PostgreSQL unique violation
                    skipped_count++;
                    continue;
                }
                throw error;
            }
        }

        // Store results in context for next seeders
        if (!context.results) context.results = {};
        context.results.categories = inserted_categories;

        if (inserted_categories.length > 0) {
            this.logSuccess(`Seeded ${inserted_categories.length} new categories`);
        }

        if (skipped_count > 0) {
            this.log(`Skipped ${skipped_count} existing categories`);
        }
    }
}
