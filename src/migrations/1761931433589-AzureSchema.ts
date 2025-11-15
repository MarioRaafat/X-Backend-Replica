import { MigrationInterface, QueryRunner } from 'typeorm';

export class AzureSchema1761931433589 implements MigrationInterface {
    name = 'AzureSchema1761931433589';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "password" character varying, "name" character varying NOT NULL, "username" character varying NOT NULL, "bio" text, "phone_number" character varying, "github_id" character varying, "facebook_id" character varying, "google_id" character varying, "avatar_url" character varying, "cover_url" text, "birth_date" date NOT NULL, "language" character varying NOT NULL DEFAULT 'en', "verified" boolean NOT NULL DEFAULT false, "country" character varying, "online" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "followers" integer NOT NULL DEFAULT '0', "following" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_01eea41349b6c9275aec646eee0" UNIQUE ("phone_number"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `CREATE TABLE "category" ("id" SMALLSERIAL NOT NULL, "name" character varying(50) NOT NULL, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweet_likes" ("user_id" uuid NOT NULL, "tweet_id" uuid NOT NULL, CONSTRAINT "PK_bfa998fb59334a5308ae2cc37c3" PRIMARY KEY ("user_id", "tweet_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweet_quotes" ("user_id" uuid NOT NULL, "quote_tweet_id" uuid NOT NULL, "original_tweet_id" uuid NOT NULL, CONSTRAINT "PK_86612e561efe1b891f6a7683af9" PRIMARY KEY ("user_id", "quote_tweet_id", "original_tweet_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweet_reposts" ("user_id" uuid NOT NULL, "tweet_id" uuid NOT NULL, CONSTRAINT "PK_ec978702331c4c809dff3d3b39b" PRIMARY KEY ("user_id", "tweet_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweet_replies" ("user_id" uuid NOT NULL, "reply_tweet_id" uuid NOT NULL, "original_tweet_id" uuid NOT NULL, CONSTRAINT "PK_4d9bad644a39116d04ee86418e4" PRIMARY KEY ("user_id", "reply_tweet_id", "original_tweet_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "tweets" ("tweet_id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "content" text NOT NULL, "images" text array NOT NULL DEFAULT '{}', "videos" text array NOT NULL DEFAULT '{}', "num_likes" integer NOT NULL DEFAULT '0', "num_reposts" integer NOT NULL DEFAULT '0', "num_views" integer NOT NULL DEFAULT '0', "num_quotes" integer NOT NULL DEFAULT '0', "num_replies" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_708f1ea2bb138c6bf68ca3a765a" PRIMARY KEY ("tweet_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "user_follows" ("follower_id" uuid NOT NULL, "followed_id" uuid NOT NULL, CONSTRAINT "PK_92b7d38e9c963943f69ec2a5258" PRIMARY KEY ("follower_id", "followed_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "user_blocks" ("blocker_id" uuid NOT NULL, "blocked_id" uuid NOT NULL, CONSTRAINT "PK_48667515438e7d0f0fed998b193" PRIMARY KEY ("blocker_id", "blocked_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "user_mutes" ("muter_id" uuid NOT NULL, "muted_id" uuid NOT NULL, CONSTRAINT "PK_ff74c7530bf7259a36c83028edd" PRIMARY KEY ("muter_id", "muted_id"))`
        );
        await query_runner.query(
            `CREATE TABLE "user_interests" ("user_id" uuid NOT NULL, "category_id" smallint NOT NULL, "score" integer NOT NULL DEFAULT '100', CONSTRAINT "PK_2d110e573adc4c39c6efb0e092e" PRIMARY KEY ("user_id", "category_id"))`
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
            `ALTER TABLE "tweets" ADD CONSTRAINT "FK_0a23c50228c2db732e3214682b0" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
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
    }

    public async down(query_runner: QueryRunner): Promise<void> {
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
            `ALTER TABLE "tweets" DROP CONSTRAINT "FK_0a23c50228c2db732e3214682b0"`
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
        await query_runner.query(`DROP TABLE "user_interests"`);
        await query_runner.query(`DROP TABLE "user_mutes"`);
        await query_runner.query(`DROP TABLE "user_blocks"`);
        await query_runner.query(`DROP TABLE "user_follows"`);
        await query_runner.query(`DROP TABLE "tweets"`);
        await query_runner.query(`DROP TABLE "tweet_replies"`);
        await query_runner.query(`DROP TABLE "tweet_reposts"`);
        await query_runner.query(`DROP TABLE "tweet_quotes"`);
        await query_runner.query(`DROP TABLE "tweet_likes"`);
        await query_runner.query(`DROP TABLE "category"`);
        await query_runner.query(`DROP TABLE "user"`);
    }
}
