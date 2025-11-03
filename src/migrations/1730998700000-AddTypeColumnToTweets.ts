import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeColumnToTweets1730998700000 implements MigrationInterface {
    name = 'AddTypeColumnToTweets1730998700000';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Create the tweet type enum if it doesn't exist
        await query_runner.query(`
            DO $$ BEGIN
                CREATE TYPE "tweet_type_enum" AS ENUM('tweet', 'reply', 'quote');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Check if type column already exists
        const has_column = await query_runner.hasColumn('tweets', 'type');

        if (!has_column) {
            // Add the type column as nullable
            await query_runner.query(`
                ALTER TABLE "tweets" 
                ADD COLUMN "type" "tweet_type_enum"
            `);

            // Migrate existing data: set type based on relationships
            await query_runner.query(`
                UPDATE "tweets" t
                SET "type" = 
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM "tweet_replies" tr WHERE tr.reply_tweet_id = t.tweet_id) THEN 'reply'::tweet_type_enum
                        WHEN EXISTS (SELECT 1 FROM "tweet_quotes" tq WHERE tq.quote_tweet_id = t.tweet_id) THEN 'quote'::tweet_type_enum
                        ELSE 'tweet'::tweet_type_enum
                    END
                WHERE "type" IS NULL
            `);
        }
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Drop the type column
        await query_runner.query(`
            ALTER TABLE "tweets" 
            DROP COLUMN IF EXISTS "type"
        `);

        // Drop the enum type
        await query_runner.query(`
            DROP TYPE IF EXISTS "tweet_type_enum"
        `);
    }
}
