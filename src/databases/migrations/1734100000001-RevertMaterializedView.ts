import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevertMaterializedView1734100000001 implements MigrationInterface {
    name = 'RevertMaterializedView1734100000001';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Drop the materialized view and its metadata
        await query_runner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['MATERIALIZED_VIEW', 'user_posts_view', 'public']
        );
        await query_runner.query(`DROP MATERIALIZED VIEW "user_posts_view"`);

        // Create regular view instead
        await query_runner.query(`CREATE VIEW "user_posts_view" AS 
        SELECT 
            t.tweet_id::text AS id,
            t.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            t.tweet_id,
            NULL::uuid AS repost_id,
            t.type::text AS post_type,
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
            t.num_bookmarks,
            t.mentions,
            t.created_at,
            t.updated_at,
            u.username,
            u.name,
            u.followers,
            u.following,
            u.avatar_url,
            u.cover_url,
            u.verified,
            u.bio,
            NULL::text AS reposted_by_name,
            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,
            trep.conversation_id AS conversation_id
        FROM tweets t
        INNER JOIN "user" u ON t.user_id = u.id
        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id
        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id
        
        UNION ALL
        
        SELECT 
            (tr.tweet_id::text || '_' || tr.user_id::text) AS id,
            tr.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            tr.tweet_id,
            tr.tweet_id AS repost_id,
            t.type::text AS post_type,
            tr.created_at AS post_date,
            'repost' AS type,
            t.content,
            t.images,
            t.videos,
            t.num_likes,
            t.num_reposts,
            t.num_views,
            t.num_quotes,
            t.num_replies,
            t.num_bookmarks,
            t.mentions,
            t.created_at,
            t.updated_at,
            u.username,
            u.name,
            u.followers,
            u.following,
            u.avatar_url,
            u.cover_url,
            u.verified,
            u.bio,
            reposter.name AS reposted_by_name,
            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,
            trep.conversation_id AS conversation_id

        FROM tweet_reposts tr
        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id
        INNER JOIN "user" u ON t.user_id = u.id
        INNER JOIN "user" reposter ON tr.user_id = reposter.id
        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id
        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id
    `);

        await query_runner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'user_posts_view',
                'SELECT \n            t.tweet_id::text AS id,\n            t.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            t.tweet_id,\n            NULL::uuid AS repost_id,\n            t.type::text AS post_type,\n            t.created_at AS post_date,\n            t.type::text AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.num_bookmarks,\n            t.mentions,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            NULL::text AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n        FROM tweets t\n        INNER JOIN "user" u ON t.user_id = u.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id\n        \n        UNION ALL\n        \n        SELECT \n            (tr.tweet_id::text || \'_\' || tr.user_id::text) AS id,\n            tr.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            tr.tweet_id,\n            tr.tweet_id AS repost_id,\n            t.type::text AS post_type,\n            tr.created_at AS post_date,\n            \'repost\' AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.num_bookmarks,\n            t.mentions,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            reposter.name AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n\n        FROM tweet_reposts tr\n        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id\n        INNER JOIN "user" u ON t.user_id = u.id\n        INNER JOIN "user" reposter ON tr.user_id = reposter.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id',
            ]
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Revert back to materialized view
        await query_runner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'user_posts_view', 'public']
        );
        await query_runner.query(`DROP VIEW "user_posts_view"`);

        await query_runner.query(`CREATE MATERIALIZED VIEW "user_posts_view" AS 
        SELECT 
            t.tweet_id::text AS id,
            t.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            t.tweet_id,
            NULL::uuid AS repost_id,
            t.type::text AS post_type,
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
            t.num_bookmarks,
            t.mentions,
            t.created_at,
            t.updated_at,
            u.username,
            u.name,
            u.followers,
            u.following,
            u.avatar_url,
            u.cover_url,
            u.verified,
            u.bio,
            NULL::text AS reposted_by_name,
            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,
            trep.conversation_id AS conversation_id
        FROM tweets t
        INNER JOIN "user" u ON t.user_id = u.id
        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id
        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id
        
        UNION ALL
        
        SELECT 
            (tr.tweet_id::text || '_' || tr.user_id::text) AS id,
            tr.user_id AS profile_user_id,
            t.user_id AS tweet_author_id,
            tr.tweet_id,
            tr.tweet_id AS repost_id,
            t.type::text AS post_type,
            tr.created_at AS post_date,
            'repost' AS type,
            t.content,
            t.images,
            t.videos,
            t.num_likes,
            t.num_reposts,
            t.num_views,
            t.num_quotes,
            t.num_replies,
            t.num_bookmarks,
            t.mentions,
            t.created_at,
            t.updated_at,
            u.username,
            u.name,
            u.followers,
            u.following,
            u.avatar_url,
            u.cover_url,
            u.verified,
            u.bio,
            reposter.name AS reposted_by_name,
            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,
            trep.conversation_id AS conversation_id

        FROM tweet_reposts tr
        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id
        INNER JOIN "user" u ON t.user_id = u.id
        INNER JOIN "user" reposter ON tr.user_id = reposter.id
        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id
        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id
    `);

        await query_runner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'MATERIALIZED_VIEW',
                'user_posts_view',
                'SELECT \n            t.tweet_id::text AS id,\n            t.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            t.tweet_id,\n            NULL::uuid AS repost_id,\n            t.type::text AS post_type,\n            t.created_at AS post_date,\n            t.type::text AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.num_bookmarks,\n            t.mentions,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            NULL::text AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n        FROM tweets t\n        INNER JOIN "user" u ON t.user_id = u.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id\n        \n        UNION ALL\n        \n        SELECT \n            (tr.tweet_id::text || \'_\' || tr.user_id::text) AS id,\n            tr.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            tr.tweet_id,\n            tr.tweet_id AS repost_id,\n            t.type::text AS post_type,\n            tr.created_at AS post_date,\n            \'repost\' AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.num_bookmarks,\n            t.mentions,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            reposter.name AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n\n        FROM tweet_reposts tr\n        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id\n        INNER JOIN "user" u ON t.user_id = u.id\n        INNER JOIN "user" reposter ON tr.user_id = reposter.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id',
            ]
        );
    }
}
