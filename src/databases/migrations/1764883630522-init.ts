import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1764883630522 implements MigrationInterface {
    name = 'Init1764883630522';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `CREATE TABLE "tweet_likes" ("user_id" uuid NOT NULL, "tweet_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bfa998fb59334a5308ae2cc37c3" PRIMARY KEY ("user_id", "tweet_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_TWEET_USER" ON "tweet_likes" ("tweet_id", "user_id") `
        );
        await query_runner.query(
            `CREATE TABLE "tweet_quotes" ("user_id" uuid NOT NULL, "quote_tweet_id" uuid NOT NULL, "original_tweet_id" uuid NOT NULL, CONSTRAINT "PK_86612e561efe1b891f6a7683af9" PRIMARY KEY ("user_id", "quote_tweet_id", "original_tweet_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweet_reposts" ("user_id" uuid NOT NULL, "tweet_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ec978702331c4c809dff3d3b39b" PRIMARY KEY ("user_id", "tweet_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweet_replies" ("user_id" uuid NOT NULL, "reply_tweet_id" uuid NOT NULL, "original_tweet_id" uuid NOT NULL, "conversation_id" uuid, CONSTRAINT "PK_4d9bad644a39116d04ee86418e4" PRIMARY KEY ("user_id", "reply_tweet_id", "original_tweet_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_USER_ORIGINAL" ON "tweet_replies" ("original_tweet_id") `
        );
        await query_runner.query(
            `CREATE TABLE "tweet_bookmarks" ("user_id" uuid NOT NULL, "tweet_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f4aa21f0e4bdf041feead2c1bae" PRIMARY KEY ("user_id", "tweet_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_USER_BOOKMARKS" ON "tweet_bookmarks" ("user_id", "created_at") `
        );
        await query_runner.query(
            `CREATE TYPE "public"."tweets_type_enum" AS ENUM('tweet', 'reply', 'quote')`
        );
        await query_runner.query(
            `CREATE TABLE "tweets" ("tweet_id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "type" "public"."tweets_type_enum", "content" text, "images" text array NOT NULL DEFAULT '{}', "videos" text array NOT NULL DEFAULT '{}', "num_likes" integer NOT NULL DEFAULT '0', "num_reposts" integer NOT NULL DEFAULT '0', "num_views" integer NOT NULL DEFAULT '0', "num_quotes" integer NOT NULL DEFAULT '0', "num_replies" integer NOT NULL DEFAULT '0', "num_bookmarks" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_708f1ea2bb138c6bf68ca3a765a" PRIMARY KEY ("tweet_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_USER_TWEETS" ON "tweets" ("user_id", "created_at") `
        );
        await query_runner.query(
            `CREATE TABLE "hashtag" ("name" character varying NOT NULL, "usage_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, CONSTRAINT "PK_347fec870eafea7b26c8a73bac1" PRIMARY KEY ("name"))`
        );
        await query_runner.query(
            `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "password" character varying, "name" character varying NOT NULL, "username" character varying NOT NULL, "bio" text, "phone_number" character varying, "github_id" character varying, "facebook_id" character varying, "google_id" character varying, "avatar_url" character varying, "cover_url" text, "birth_date" date NOT NULL, "language" character varying NOT NULL DEFAULT 'en', "verified" boolean NOT NULL DEFAULT false, "country" character varying, "online" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "followers" integer NOT NULL DEFAULT '0', "following" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_01eea41349b6c9275aec646eee0" UNIQUE ("phone_number"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `CREATE TABLE "category" ("id" SMALLSERIAL NOT NULL, "name" character varying(50) NOT NULL, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `CREATE TABLE "user_follows" ("follower_id" uuid NOT NULL, "followed_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_92b7d38e9c963943f69ec2a5258" PRIMARY KEY ("follower_id", "followed_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_FOLLOWED" ON "user_follows" ("followed_id", "created_at") `
        );
        await query_runner.query(
            `CREATE INDEX "IDX_FOLLOWER" ON "user_follows" ("follower_id", "created_at") `
        );
        await query_runner.query(
            `CREATE TABLE "user_blocks" ("blocker_id" uuid NOT NULL, "blocked_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_48667515438e7d0f0fed998b193" PRIMARY KEY ("blocker_id", "blocked_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_BLOCKER" ON "user_blocks" ("blocker_id", "created_at") `
        );
        await query_runner.query(
            `CREATE TABLE "user_mutes" ("muter_id" uuid NOT NULL, "muted_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ff74c7530bf7259a36c83028edd" PRIMARY KEY ("muter_id", "muted_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "user_interests" ("user_id" uuid NOT NULL, "category_id" smallint NOT NULL, "score" integer NOT NULL DEFAULT '100', CONSTRAINT "PK_2d110e573adc4c39c6efb0e092e" PRIMARY KEY ("user_id", "category_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweet_categories" ("tweet_id" uuid NOT NULL, "category_id" smallint NOT NULL, "percentage" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_971fcf9897bf9c05a94df12b9b8" PRIMARY KEY ("tweet_id", "category_id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_CATEGORY" ON "tweet_categories" ("category_id", "tweet_id") `
        );
        await query_runner.query(
            `CREATE TYPE "public"."messages_message_type_enum" AS ENUM('text', 'reply')`
        );
        await query_runner.query(
            `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "content" text NOT NULL, "message_type" "public"."messages_message_type_enum" NOT NULL DEFAULT 'text', "sender_id" uuid NOT NULL, "chat_id" uuid NOT NULL, "reply_to_message_id" uuid, "is_read" boolean NOT NULL DEFAULT false, "is_edited" boolean NOT NULL DEFAULT false, "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_CHAT_CREATED_AT" ON "messages" ("chat_id", "created_at") `
        );
        await query_runner.query(
            `CREATE TABLE "chats" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user1_id" uuid NOT NULL, "user2_id" uuid NOT NULL, "last_message_id" uuid, "unread_count_user1" integer NOT NULL DEFAULT '0', "unread_count_user2" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_likes" ADD CONSTRAINT "FK_a4242dd40869e106aceae558dbd" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_likes" ADD CONSTRAINT "FK_b08a22eba5b3c4b56e5666f44a6" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_quotes" ADD CONSTRAINT "FK_64f6e751441935a694248321d0d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_quotes" ADD CONSTRAINT "FK_9b6d025342804bf7404691402fd" FOREIGN KEY ("quote_tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_quotes" ADD CONSTRAINT "FK_03e4db2d492a3278c56a392795e" FOREIGN KEY ("original_tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" ADD CONSTRAINT "FK_af573779d38ae12d74babf7ed9f" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" ADD CONSTRAINT "FK_ec8144996f19327dc8cb1562b5a" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_replies" ADD CONSTRAINT "FK_27e99bb7025501369765dc5a047" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_replies" ADD CONSTRAINT "FK_0e060f000ec5fd1a4b31ffb685d" FOREIGN KEY ("reply_tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_replies" ADD CONSTRAINT "FK_1c9affad591dc026ddd59113712" FOREIGN KEY ("original_tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD CONSTRAINT "FK_51b27a18d137b705c3523bcd336" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD CONSTRAINT "FK_1a295acf3ed6eea0db67b9ce6c3" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweets" ADD CONSTRAINT "FK_0a23c50228c2db732e3214682b0" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "hashtag" ADD CONSTRAINT "FK_11c8b3519f62b36dd5385c217d3" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_f7af3bf8f2dcba61b4adc108239" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_d1c60ce6211712ba833df9ccd6e" FOREIGN KEY ("followed_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "user_interests" ADD CONSTRAINT "FK_cb0511a8fabd1a2ac9912f7a9aa" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "user_interests" ADD CONSTRAINT "FK_1d291265e63ae6c1a50de31682e" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_categories" ADD CONSTRAINT "FK_2b4ee6b36f719addb2be60efdd3" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_categories" ADD CONSTRAINT "FK_c5786e021a586ae7fd93ee65c0e" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_7f87cbb925b1267778a7f4c5d67" FOREIGN KEY ("reply_to_message_id") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a" FOREIGN KEY ("user1_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_a14c79d67133bb0df4a71807a74" FOREIGN KEY ("user2_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_07b7d9dde84f3d2f0403de3bf09" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(`CREATE VIEW "user_posts_view" AS 
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
                'SELECT \n            t.tweet_id::text AS id,\n            t.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            t.tweet_id,\n            NULL::uuid AS repost_id,\n            \'tweet\' AS post_type,\n            t.created_at AS post_date,\n            t.type::text AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            NULL::text AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n        FROM tweets t\n        INNER JOIN "user" u ON t.user_id = u.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id\n        \n        UNION ALL\n        \n        SELECT \n            (tr.tweet_id::text || \'_\' || tr.user_id::text) AS id,\n            tr.user_id AS profile_user_id,\n            t.user_id AS tweet_author_id,\n            tr.tweet_id,\n            tr.tweet_id AS repost_id,\n            t.type::text AS post_type,\n            tr.created_at AS post_date,\n            \'repost\' AS type,\n            t.content,\n            t.images,\n            t.videos,\n            t.num_likes,\n            t.num_reposts,\n            t.num_views,\n            t.num_quotes,\n            t.num_replies,\n            t.created_at,\n            t.updated_at,\n            u.username,\n            u.name,\n            u.followers,\n            u.following,\n            u.avatar_url,\n            u.cover_url,\n            u.verified,\n            u.bio,\n            reposter.name AS reposted_by_name,\n            COALESCE(tq.original_tweet_id, trep.original_tweet_id) AS parent_id,\n            trep.conversation_id AS conversation_id\n\n        FROM tweet_reposts tr\n        INNER JOIN tweets t ON tr.tweet_id = t.tweet_id\n        INNER JOIN "user" u ON t.user_id = u.id\n        INNER JOIN "user" reposter ON tr.user_id = reposter.id\n        LEFT JOIN tweet_quotes tq ON t.tweet_id = tq.quote_tweet_id\n        LEFT JOIN tweet_replies trep ON t.tweet_id = trep.reply_tweet_id',
            ]
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'user_posts_view', 'public']
        );
        await query_runner.query(`DROP VIEW "user_posts_view"`);
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_07b7d9dde84f3d2f0403de3bf09"`
        );
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_a14c79d67133bb0df4a71807a74"`
        );
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_7f87cbb925b1267778a7f4c5d67"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_categories" DROP CONSTRAINT "FK_c5786e021a586ae7fd93ee65c0e"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_categories" DROP CONSTRAINT "FK_2b4ee6b36f719addb2be60efdd3"`
        );
        await query_runner.query(
            `ALTER TABLE "user_interests" DROP CONSTRAINT "FK_1d291265e63ae6c1a50de31682e"`
        );
        await query_runner.query(
            `ALTER TABLE "user_interests" DROP CONSTRAINT "FK_cb0511a8fabd1a2ac9912f7a9aa"`
        );
        await query_runner.query(
            `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_d1c60ce6211712ba833df9ccd6e"`
        );
        await query_runner.query(
            `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_f7af3bf8f2dcba61b4adc108239"`
        );
        await query_runner.query(
            `ALTER TABLE "hashtag" DROP CONSTRAINT "FK_11c8b3519f62b36dd5385c217d3"`
        );
        await query_runner.query(
            `ALTER TABLE "tweets" DROP CONSTRAINT "FK_0a23c50228c2db732e3214682b0"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" DROP CONSTRAINT "FK_1a295acf3ed6eea0db67b9ce6c3"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" DROP CONSTRAINT "FK_51b27a18d137b705c3523bcd336"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_replies" DROP CONSTRAINT "FK_1c9affad591dc026ddd59113712"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_replies" DROP CONSTRAINT "FK_0e060f000ec5fd1a4b31ffb685d"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_replies" DROP CONSTRAINT "FK_27e99bb7025501369765dc5a047"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" DROP CONSTRAINT "FK_ec8144996f19327dc8cb1562b5a"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" DROP CONSTRAINT "FK_af573779d38ae12d74babf7ed9f"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_quotes" DROP CONSTRAINT "FK_03e4db2d492a3278c56a392795e"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_quotes" DROP CONSTRAINT "FK_9b6d025342804bf7404691402fd"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_quotes" DROP CONSTRAINT "FK_64f6e751441935a694248321d0d"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_likes" DROP CONSTRAINT "FK_b08a22eba5b3c4b56e5666f44a6"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_likes" DROP CONSTRAINT "FK_a4242dd40869e106aceae558dbd"`
        );
        await query_runner.query(`DROP TABLE "chats"`);
        await query_runner.query(`DROP INDEX "public"."IDX_CHAT_CREATED_AT"`);
        await query_runner.query(`DROP TABLE "messages"`);
        await query_runner.query(`DROP TYPE "public"."messages_message_type_enum"`);
        await query_runner.query(`DROP INDEX "public"."IDX_CATEGORY"`);
        await query_runner.query(`DROP TABLE "tweet_categories"`);
        await query_runner.query(`DROP TABLE "user_interests"`);
        await query_runner.query(`DROP TABLE "user_mutes"`);
        await query_runner.query(`DROP INDEX "public"."IDX_BLOCKER"`);
        await query_runner.query(`DROP TABLE "user_blocks"`);
        await query_runner.query(`DROP INDEX "public"."IDX_FOLLOWER"`);
        await query_runner.query(`DROP INDEX "public"."IDX_FOLLOWED"`);
        await query_runner.query(`DROP TABLE "user_follows"`);
        await query_runner.query(`DROP TABLE "category"`);
        await query_runner.query(`DROP TABLE "user"`);
        await query_runner.query(`DROP TABLE "hashtag"`);
        await query_runner.query(`DROP INDEX "public"."IDX_USER_TWEETS"`);
        await query_runner.query(`DROP TABLE "tweets"`);
        await query_runner.query(`DROP TYPE "public"."tweets_type_enum"`);
        await query_runner.query(`DROP INDEX "public"."IDX_USER_BOOKMARKS"`);
        await query_runner.query(`DROP TABLE "tweet_bookmarks"`);
        await query_runner.query(`DROP INDEX "public"."IDX_USER_ORIGINAL"`);
        await query_runner.query(`DROP TABLE "tweet_replies"`);
        await query_runner.query(`DROP TABLE "tweet_reposts"`);
        await query_runner.query(`DROP TABLE "tweet_quotes"`);
        await query_runner.query(`DROP INDEX "public"."IDX_TWEET_USER"`);
        await query_runner.query(`DROP TABLE "tweet_likes"`);
    }
}
