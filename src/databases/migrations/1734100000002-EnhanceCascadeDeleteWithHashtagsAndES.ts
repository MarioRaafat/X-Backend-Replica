import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceCascadeDeleteWithHashtagsAndES1734100000002 implements MigrationInterface {
    name = 'EnhanceCascadeDeleteWithHashtagsAndES1736100000002';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Create a table to track deleted tweets for Elasticsearch cleanup
        await query_runner.query(`
            CREATE TABLE IF NOT EXISTS deleted_tweets_log (
                tweet_id uuid NOT NULL,
                content text,
                deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                PRIMARY KEY (tweet_id)
            )
        `);

        // Create index for efficient cleanup queries
        await query_runner.query(`
            CREATE INDEX IF NOT EXISTS idx_deleted_tweets_deleted_at 
            ON deleted_tweets_log(deleted_at)
        `);

        // Drop the old trigger and function
        await query_runner.query(`
            DROP TRIGGER IF EXISTS trigger_cascade_delete_child_tweets ON tweets;
        `);
        await query_runner.query(`
            DROP FUNCTION IF EXISTS cascade_delete_child_tweets();
        `);

        // Create function that logs deletions with content
        await query_runner.query(`
            CREATE OR REPLACE FUNCTION cascade_delete_child_tweets()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Log all child tweets (replies and quotes) with their content
                INSERT INTO deleted_tweets_log (tweet_id, content)
                SELECT tweet_id, content
                FROM tweets
                WHERE tweet_id IN (
                    SELECT reply_tweet_id
                    FROM tweet_replies
                    WHERE original_tweet_id = OLD.tweet_id
                    
                    UNION
                    
                    SELECT quote_tweet_id
                    FROM tweet_quotes
                    WHERE original_tweet_id = OLD.tweet_id
                )
                ON CONFLICT (tweet_id) DO NOTHING;

                -- Log the main tweet being deleted with its content
                INSERT INTO deleted_tweets_log (tweet_id, content)
                VALUES (OLD.tweet_id, OLD.content)
                ON CONFLICT (tweet_id) DO NOTHING;

                -- Delete all reply tweets when a parent tweet is deleted
                DELETE FROM tweets
                WHERE tweet_id IN (
                    SELECT reply_tweet_id
                    FROM tweet_replies
                    WHERE original_tweet_id = OLD.tweet_id
                );

                -- Delete all quote tweets when a parent tweet is deleted
                DELETE FROM tweets
                WHERE tweet_id IN (
                    SELECT quote_tweet_id
                    FROM tweet_quotes
                    WHERE original_tweet_id = OLD.tweet_id
                );

                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Recreate the trigger
        await query_runner.query(`
            CREATE TRIGGER trigger_cascade_delete_child_tweets
            BEFORE DELETE ON tweets
            FOR EACH ROW
            EXECUTE FUNCTION cascade_delete_child_tweets();
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Drop the enhanced trigger and function
        await query_runner.query(`
            DROP TRIGGER IF EXISTS trigger_cascade_delete_child_tweets ON tweets;
        `);
        await query_runner.query(`
            DROP FUNCTION IF EXISTS cascade_delete_child_tweets();
        `);

        // Restore the original simple function
        await query_runner.query(`
            CREATE OR REPLACE FUNCTION cascade_delete_child_tweets()
            RETURNS TRIGGER AS $$
            BEGIN
                DELETE FROM tweets
                WHERE tweet_id IN (
                    SELECT reply_tweet_id
                    FROM tweet_replies
                    WHERE original_tweet_id = OLD.tweet_id
                );

                DELETE FROM tweets
                WHERE tweet_id IN (
                    SELECT quote_tweet_id
                    FROM tweet_quotes
                    WHERE original_tweet_id = OLD.tweet_id
                );

                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Recreate the original trigger
        await query_runner.query(`
            CREATE TRIGGER trigger_cascade_delete_child_tweets
            BEFORE DELETE ON tweets
            FOR EACH ROW
            EXECUTE FUNCTION cascade_delete_child_tweets();
        `);

        // Drop the deleted tweets log table
        await query_runner.query(`
            DROP INDEX IF EXISTS idx_deleted_tweets_deleted_at;
        `);
        await query_runner.query(`
            DROP TABLE IF EXISTS deleted_tweets_log;
        `);
    }
}
