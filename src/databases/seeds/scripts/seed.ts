import { DataSource } from 'typeorm';
import { ExcelReader, ITopicSheets } from '../utils/excel-reader';
import { UserSeeder } from './user.seed';
import AppDataSource from 'src/databases/data-source';
import { TweetSeeder } from './tweet.seed';
import { ReplySeeder } from './reply.seed';
import { ISeederContext } from './seeder.interface';
import { CategorySeeder } from './category.seed';

async function main() {
    // Parse topics from command line
    const topics = process.argv.slice(2);

    if (topics.length === 0) {
        console.error('❌ Error: Please specify topics to seed');
        console.log('\nUsage: npm run seed <topic1> <topic2> ...');
        console.log('Example: npm run seed music football technology\n');
        process.exit(1);
    }

    let data_source: DataSource | undefined;

    try {
        // Connect to database
        console.log('🔌 Connecting to database...');
        console.log('Connecting with config:', {
            host: AppDataSource.options.database,
            port: AppDataSource.options,
        });

        data_source = await AppDataSource.initialize();
        console.log('✅ Connected\n');

        // Read all topic data
        console.log(`📚 Reading ${topics.length} topic(s)...\n`);
        const topics_data = ExcelReader.readTopics(topics);

        if (topics_data.size === 0) {
            console.log('⚠️  No topics loaded, exiting...');
            return;
        }

        // Print summary

        // Process each topic
        for (const [topic_name, data] of topics_data.entries()) {
            await processTopic(data_source, topic_name, data);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 Database seeding completed successfully!');
        console.log('='.repeat(60));
    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (data_source?.isInitialized) {
            await data_source.destroy();
            console.log('\n🔌 Database connection closed');
        }
    }
}

/**
 * Process a single topic through all seeders
 */
async function processTopic(
    data_source: DataSource,
    topic_name: string,
    data: ITopicSheets
): Promise<void> {
    console.log('='.repeat(60));
    console.log(`🏷️  TOPIC: ${topic_name.toUpperCase()}`);
    console.log('='.repeat(60));

    const context: ISeederContext = {
        data_source,
        topic_name,
        data,
        results: {},
    };

    // 0. Seed Categories
    await runSeeder('CategorySeeder', async () => {
        const seeder = new CategorySeeder();
        await seeder.seed(context);
    });

    // 1. Seed Users
    await runSeeder('UserSeeder', async () => {
        const seeder = new UserSeeder();
        await seeder.seed(context);
    });

    // 3. Seed Tweets
    await runSeeder('TweetSeeder', async () => {
        const seeder = new TweetSeeder();
        await seeder.seed(context);
    });

    // 4. Seed Replies (Future)
    await runSeeder('ReplySeeder', async () => {
        const seeder = new ReplySeeder();
        await seeder.seed(context);
    });

    console.log(`\n✅ Completed topic: ${topic_name}\n`);
}
async function runSeeder(name: string, seed_fn: () => Promise<void>): Promise<void> {
    console.log(`\n▶️  ${name}`);

    try {
        await seed_fn();
    } catch (error) {
        console.error(`   ❌ ${name} failed: ${error.message}`);
        console.log(`   Skipping to next seeder...`);
    }
}

// Run the seeding
main()
    .then(() => {
        console.log('✅ Seed script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seed script failed:', error);
        process.exit(1);
    });
