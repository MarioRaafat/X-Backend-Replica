import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUserPostsViewTypeColumn1730999000000 implements MigrationInterface {
    public async up(query_runner: QueryRunner): Promise<void> {
        // Drop existing view
        await query_runner.query(`DROP VIEW IF EXISTS user_posts_view`);

        // Recreate view with type cast to text
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
        // Drop the view
        await query_runner.query(`DROP VIEW IF EXISTS user_posts_view`);

        // Recreate old version (without cast)
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
                t.type AS type,
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
                t.type AS type,
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
}
