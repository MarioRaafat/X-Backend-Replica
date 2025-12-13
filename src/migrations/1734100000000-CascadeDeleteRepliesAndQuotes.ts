import { MigrationInterface, QueryRunner } from 'typeorm';

export class CascadeDeleteRepliesAndQuotes1734100000000 implements MigrationInterface {
    name = 'CascadeDeleteRepliesAndQuotes1734100000000';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Create a function that cascades delete for reply and quote tweets
        await query_runner.query(`
            CREATE OR REPLACE FUNCTION cascade_delete_child_tweets()
            RETURNS TRIGGER AS $$
            BEGIN
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

        // Create trigger that runs BEFORE a tweet is deleted
        // This ensures the relationships still exist when we query them
        await query_runner.query(`
            CREATE TRIGGER trigger_cascade_delete_child_tweets
            BEFORE DELETE ON tweets
            FOR EACH ROW
            EXECUTE FUNCTION cascade_delete_child_tweets();
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Drop the trigger first
        await query_runner.query(`
            DROP TRIGGER IF EXISTS trigger_cascade_delete_child_tweets ON tweets;
        `);

        // Drop the function
        await query_runner.query(`
            DROP FUNCTION IF EXISTS cascade_delete_child_tweets();
        `);
    }
}
