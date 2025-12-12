import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCreatedBy1765557470457 implements MigrationInterface {
    name = 'RemoveCreatedBy1765557470457';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "hashtag" DROP CONSTRAINT "FK_11c8b3519f62b36dd5385c217d3"`
        );

        await query_runner.query(`ALTER TABLE "hashtag" DROP COLUMN "created_by"`);

        await query_runner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'user_posts_view',
                'SELECT \n            t.tweet_id::text AS id,\n            t.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            t.tweet_id,\n            NULL::uuid AS repost_id,\n            \'tweet\' AS post_type,\n            t.created_at AS post_date,\n            t.type::text AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            NULL::text AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n        FROM tweets t\n        INNER JOIN "user" u ON t.user_id = u.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id\n        \n        UNION ALL\n        \n        SELECT \n            (tr.tweet_id::text || \'_\' || tr.user_id::text) AS id,\n            tr.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            tr.tweet_id,\n            tr.tweet_id AS repost_id,\n            t.type::text AS post_type,\n            tr.created_at AS post_date,\n            \'repost\' AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            reposter.name AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n\n        FROM tweet_reposts tr\n        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id\n        INNER JOIN "user" u ON t.user_id = u.id\n        INNER JOIN "user" reposter ON tr.user_id = reposter.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id',
            ]
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "hashtag" ADD "created_by" uuid`);

        await query_runner.query(
            `ALTER TABLE "hashtag" ADD CONSTRAINT "FK_11c8b3519f62b36dd5385c217d3" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
