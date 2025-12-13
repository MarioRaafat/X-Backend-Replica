import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHashtagCleanupTrigger1765394569999 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        // Create function to cleanup hashtags when tweet is deleted
        await query_runner.query(`
            CREATE OR REPLACE FUNCTION cleanup_hashtags_on_tweet_delete()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Decrement usage_count for all hashtags associated with the deleted tweet
                UPDATE hashtag
                SET usage_count = usage_count - 1
                WHERE name IN (
                    SELECT hashtag_name 
                    FROM tweet_hashtags 
                    WHERE tweet_id = OLD.tweet_id
                );

                -- Delete hashtags with usage_count <= 0
                DELETE FROM hashtag 
                WHERE usage_count <= 0;

                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create trigger that fires BEFORE DELETE on tweet table
        await query_runner.query(`
            CREATE TRIGGER tweet_delete_hashtag_cleanup_trigger
            BEFORE DELETE ON "tweets"
            FOR EACH ROW
            EXECUTE FUNCTION cleanup_hashtags_on_tweet_delete();
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Drop trigger
        await query_runner.query(`
            DROP TRIGGER IF EXISTS tweet_delete_hashtag_cleanup_trigger ON "tweets"
        `);

        // Drop function
        await query_runner.query(`
            DROP FUNCTION IF EXISTS cleanup_hashtags_on_tweet_delete()
        `);
    }
}
