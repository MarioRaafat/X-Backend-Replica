import { DataSource } from 'typeorm';

/**
 * Seeder Context
 * Contains all data needed by seeders
 */
export interface ISeederContext {
    data_source: DataSource;
    topic_name: string;
    data: {
        users: any[];
        tweets: any[];
        replies: any[];
    };
    results?: {
        categories?: any[];
        users?: any[];
        tweets?: any[];
        replies?: any[];
        user_id_map?: Map<string, string>;
        tweet_id_map?: Map<string, string>;
    };
}

/**
 * Base Seeder Interface
 * All seeders must implement this interface
 */
export interface ISeeder {
    /**
     * Execute seeding operation
     * @param context - Seeder context with data and dependencies
     */
    seed(context: ISeederContext): Promise<void>;

    /**
     * Get seeder name for logging
     */
    getName(): string;
}

/**
 * Abstract Base Seeder
 * Provides common functionality for all seeders
 */
export abstract class BaseSeeder implements ISeeder {
    abstract seed(context: ISeederContext): Promise<void>;
    abstract getName(): string;

    protected log(message: string): void {
        console.log(`   ${message}`);
    }

    protected logSuccess(message: string): void {
        console.log(`   ✅ ${message}`);
    }

    protected logWarning(message: string): void {
        console.warn(`   ⚠️  ${message}`);
    }

    protected logError(message: string): void {
        console.error(`   ❌ ${message}`);
    }
}
