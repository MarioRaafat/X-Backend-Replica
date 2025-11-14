import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTweetRepostsSchema1730378000000 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        // Drop the existing composite primary key constraint
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" DROP CONSTRAINT IF EXISTS "PK_tweet_reposts"`
        );

        // Add new UUID primary key column with auto-generation
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY`
        );

        // Add created_at timestamp column (defaults to now() for existing rows)
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`
        );

        // Add index on user_id and tweet_id for faster queries
        await query_runner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_tweet_reposts_user_tweet" ON "tweet_reposts" ("user_id", "tweet_id")`
        );

        // Add index on created_at for ordering
        await query_runner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_tweet_reposts_created_at" ON "tweet_reposts" ("created_at")`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Drop the indexes
        await query_runner.query(`DROP INDEX IF EXISTS "IDX_tweet_reposts_created_at"`);
        await query_runner.query(`DROP INDEX IF EXISTS "IDX_tweet_reposts_user_tweet"`);

        // Drop the new columns
        await query_runner.query(`ALTER TABLE "tweet_reposts" DROP COLUMN IF EXISTS "created_at"`);
        await query_runner.query(`ALTER TABLE "tweet_reposts" DROP COLUMN IF EXISTS "id"`);

        // Restore the composite primary key
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" ADD CONSTRAINT "PK_tweet_reposts" PRIMARY KEY ("user_id", "tweet_id")`
        );
    }
}
