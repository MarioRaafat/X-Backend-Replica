import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevertTweetRepostsToCompositePK1731000000000 implements MigrationInterface {
    name = 'RevertTweetRepostsToCompositePK1731000000000';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Drop the view first (it depends on tweet_reposts)
        await query_runner.query(`DROP VIEW IF EXISTS "user_posts_view"`);

        // Remove the unique constraint first (if it exists from previous migration)
        await query_runner.query(`
            ALTER TABLE "tweet_reposts" 
            DROP CONSTRAINT IF EXISTS "UQ_tweet_reposts_user_tweet"
        `);

        // Create a new table with composite primary key
        await query_runner.query(`
            CREATE TABLE "tweet_reposts_new" (
                "user_id" uuid NOT NULL,
                "tweet_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tweet_reposts" PRIMARY KEY ("user_id", "tweet_id"),
                CONSTRAINT "FK_tweet_reposts_user" FOREIGN KEY ("user_id") 
                    REFERENCES "user"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_tweet_reposts_tweet" FOREIGN KEY ("tweet_id") 
                    REFERENCES "tweets"("tweet_id") ON DELETE CASCADE
            )
        `);

        // Copy data from old table to new table (handling duplicates by keeping most recent)
        await query_runner.query(`
            INSERT INTO "tweet_reposts_new" ("user_id", "tweet_id", "created_at")
            SELECT DISTINCT ON (user_id, tweet_id) user_id, tweet_id, created_at
            FROM "tweet_reposts"
            ORDER BY user_id, tweet_id, created_at DESC
        `);

        // Drop old indexes
        await query_runner.query(`DROP INDEX IF EXISTS "IDX_tweet_reposts_user_tweet"`);
        await query_runner.query(`DROP INDEX IF EXISTS "IDX_tweet_reposts_created_at"`);

        // Drop the old table
        await query_runner.query(`DROP TABLE "tweet_reposts"`);

        // Rename the new table
        await query_runner.query(`ALTER TABLE "tweet_reposts_new" RENAME TO "tweet_reposts"`);

        // Create indexes for performance
        await query_runner.query(`
            CREATE INDEX "IDX_tweet_reposts_user_id" ON "tweet_reposts" ("user_id")
        `);
        await query_runner.query(`
            CREATE INDEX "IDX_tweet_reposts_tweet_id" ON "tweet_reposts" ("tweet_id")
        `);
        await query_runner.query(`
            CREATE INDEX "IDX_tweet_reposts_created_at" ON "tweet_reposts" ("created_at" DESC)
        `);

        // Recreate the view
        await query_runner.query(`
            CREATE VIEW user_posts_view AS
            SELECT 
                t.tweet_id::text AS id,
                t.user_id AS profile_user_id,
                t.user_id AS tweet_author_id,
                t.tweet_id,
                NULL::uuid AS repost_id,
                'tweet' AS post_type,
                t.created_at AS post_date,
                t.type::text AS type,
                t.content,
                t.images,
                t.videos,
                t.num_likes,
                t.num_reposts,
                t.num_views,
                t.num_quotes,
                t.num_replies,
                t.created_at,
                t.updated_at
            FROM tweets t
            
            UNION ALL
            
            SELECT 
                (tr.tweet_id::text || '_' || tr.user_id::text) AS id,
                tr.user_id AS profile_user_id,
                t.user_id AS tweet_author_id,
                tr.tweet_id,
                tr.tweet_id AS repost_id,
                'repost' AS post_type,
                tr.created_at AS post_date,
                t.type::text AS type,
                t.content,
                t.images,
                t.videos,
                t.num_likes,
                t.num_reposts,
                t.num_views,
                t.num_quotes,
                t.num_replies,
                t.created_at,
                t.updated_at
            FROM tweet_reposts tr
            INNER JOIN tweets t ON tr.tweet_id = t.tweet_id
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Create the old table structure with UUID id
        await query_runner.query(`
            CREATE TABLE "tweet_reposts_old" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "tweet_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tweet_reposts_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_tweet_reposts_user_tweet" UNIQUE ("user_id", "tweet_id"),
                CONSTRAINT "FK_tweet_reposts_user" FOREIGN KEY ("user_id") 
                    REFERENCES "user"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_tweet_reposts_tweet" FOREIGN KEY ("tweet_id") 
                    REFERENCES "tweets"("tweet_id") ON DELETE CASCADE
            )
        `);

        // Copy data back
        await query_runner.query(`
            INSERT INTO "tweet_reposts_old" ("user_id", "tweet_id", "created_at")
            SELECT "user_id", "tweet_id", "created_at"
            FROM "tweet_reposts"
        `);

        // Drop indexes
        await query_runner.query(`DROP INDEX IF EXISTS "IDX_tweet_reposts_user_id"`);
        await query_runner.query(`DROP INDEX IF EXISTS "IDX_tweet_reposts_tweet_id"`);
        await query_runner.query(`DROP INDEX IF EXISTS "IDX_tweet_reposts_created_at"`);

        // Drop the composite PK table
        await query_runner.query(`DROP TABLE "tweet_reposts"`);

        // Rename back
        await query_runner.query(`ALTER TABLE "tweet_reposts_old" RENAME TO "tweet_reposts"`);

        // Recreate old indexes
        await query_runner.query(`
            CREATE INDEX "IDX_tweet_reposts_user_tweet" ON "tweet_reposts" ("user_id", "tweet_id")
        `);
        await query_runner.query(`
            CREATE INDEX "IDX_tweet_reposts_created_at" ON "tweet_reposts" ("created_at")
        `);
    }
}
