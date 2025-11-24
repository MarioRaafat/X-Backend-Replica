import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditRelationshipsTimezone1764002333009 implements MigrationInterface {
    name = 'EditRelationshipsTimezone1764002333009';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "tweet_likes" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweet_likes" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "tweet_reposts" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "tweet_bookmarks" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "hashtag" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "hashtag" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "hashtag" DROP COLUMN "deleted_at"`);
        await query_runner.query(`ALTER TABLE "hashtag" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "hashtag" DROP COLUMN "deleted_at"`);
        await query_runner.query(`ALTER TABLE "hashtag" ADD "deleted_at" TIMESTAMP`);
        await query_runner.query(`ALTER TABLE "hashtag" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "hashtag" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "tweet_bookmarks" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "tweet_reposts" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweet_reposts" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "tweet_likes" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweet_likes" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
    }
}
