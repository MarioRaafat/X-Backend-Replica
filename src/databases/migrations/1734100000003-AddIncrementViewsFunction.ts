import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIncrementViewsFunction1734100000003 implements MigrationInterface {
    name = 'AddIncrementViewsFunction1734100000003';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Create a function that increments tweet views atomically
        await query_runner.query(`
            CREATE OR REPLACE FUNCTION increment_tweet_view(p_tweet_id UUID)
            RETURNS INTEGER AS $$
            DECLARE
                v_new_count INTEGER;
            BEGIN
                UPDATE tweets
                SET num_views = num_views + 1
                WHERE tweet_id = p_tweet_id
                RETURNING num_views INTO v_new_count;
                
                RETURN COALESCE(v_new_count, 0);
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create a function that increments multiple tweet views at once
        await query_runner.query(`
            CREATE OR REPLACE FUNCTION increment_tweet_views_batch(p_tweet_ids UUID[])
            RETURNS VOID AS $$
            BEGIN
                UPDATE tweets
                SET num_views = num_views + 1
                WHERE tweet_id = ANY(p_tweet_ids);
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create an index on tweet_id if it doesn't exist for better performance
        await query_runner.query(`
            CREATE INDEX IF NOT EXISTS idx_tweets_tweet_id ON tweets(tweet_id);
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Drop the functions
        await query_runner.query(`DROP FUNCTION IF EXISTS increment_tweet_view(UUID);`);
        await query_runner.query(`DROP FUNCTION IF EXISTS increment_tweet_views_batch(UUID[]);`);

        // Drop the index
        await query_runner.query(`DROP INDEX IF EXISTS idx_tweets_tweet_id;`);
    }
}
