import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUserTweetUniqueInReposts1761931309114 implements MigrationInterface {
    name = 'MakeUserTweetUniqueInReposts1761931309114';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Check if id column exists (it won't if composite PK migration ran first)
        const has_id_column = await query_runner.hasColumn('tweet_reposts', 'id');

        if (has_id_column) {
            // First, remove any duplicate reposts keeping only the most recent one
            await query_runner.query(`
                DELETE FROM tweet_reposts 
                WHERE id NOT IN (
                    SELECT id FROM (
                        SELECT DISTINCT ON (user_id, tweet_id) id
                        FROM tweet_reposts
                        ORDER BY user_id, tweet_id, created_at DESC
                    ) AS unique_reposts
                )
            `);

            // Add unique constraint on (user_id, tweet_id)
            await query_runner.query(`
                ALTER TABLE "tweet_reposts" 
                ADD CONSTRAINT "UQ_tweet_reposts_user_tweet" 
                UNIQUE ("user_id", "tweet_id")
            `);
        }
        // If id column doesn't exist, composite PK already ensures uniqueness, so skip
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Remove the unique constraint
        await query_runner.query(`
            ALTER TABLE "tweet_reposts" 
            DROP CONSTRAINT "UQ_tweet_reposts_user_tweet"
        `);
    }
}
