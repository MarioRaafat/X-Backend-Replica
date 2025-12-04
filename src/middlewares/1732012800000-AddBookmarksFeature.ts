import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookmarksFeature1732012800000 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        // Create tweet_bookmarks table
        await query_runner.query(`
            CREATE TABLE "tweet_bookmarks" (
                "user_id" UUID NOT NULL,
                "tweet_id" UUID NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_tweet_bookmarks" PRIMARY KEY ("user_id", "tweet_id"),
                CONSTRAINT "FK_tweet_bookmarks_user" FOREIGN KEY ("user_id") 
                    REFERENCES "user"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_tweet_bookmarks_tweet" FOREIGN KEY ("tweet_id") 
                    REFERENCES "tweets"("tweet_id") ON DELETE CASCADE
            )
        `);

        // Add index for faster lookups by tweet_id
        await query_runner.query(`
            CREATE INDEX "IDX_tweet_bookmarks_tweet_id" ON "tweet_bookmarks" ("tweet_id")
        `);

        // Add index for faster lookups by user_id
        await query_runner.query(`
            CREATE INDEX "IDX_tweet_bookmarks_user_id" ON "tweet_bookmarks" ("user_id")
        `);

        // Add num_bookmarks column to tweets table
        await query_runner.query(`
            ALTER TABLE "tweets" 
            ADD COLUMN "num_bookmarks" INTEGER NOT NULL DEFAULT 0
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Remove num_bookmarks column from tweets table
        await query_runner.query(`
            ALTER TABLE "tweets" 
            DROP COLUMN "num_bookmarks"
        `);

        // Drop indexes
        await query_runner.query(`
            DROP INDEX "IDX_tweet_bookmarks_user_id"
        `);

        await query_runner.query(`
            DROP INDEX "IDX_tweet_bookmarks_tweet_id"
        `);

        // Drop tweet_bookmarks table
        await query_runner.query(`
            DROP TABLE "tweet_bookmarks"
        `);
    }
}
