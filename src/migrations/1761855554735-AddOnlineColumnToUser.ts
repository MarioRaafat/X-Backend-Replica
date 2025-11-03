import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnlineColumnToUser1761855554735 implements MigrationInterface {
    name = 'AddOnlineColumnToUser1761855554735';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "gender"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "role"`);
        await query_runner.query(`ALTER TABLE "user" ADD "country" character varying`);
        await query_runner.query(`ALTER TABLE "user" ADD "online" boolean NOT NULL DEFAULT false`);
        await query_runner.query(`ALTER TABLE "user" ADD "followers" integer NOT NULL DEFAULT '0'`);
        await query_runner.query(`ALTER TABLE "user" ADD "following" integer NOT NULL DEFAULT '0'`);
        await query_runner.query(
            `ALTER TABLE "tweets" ADD "num_replies" integer NOT NULL DEFAULT '0'`
        );
        // Update any null content values before changing column type
        await query_runner.query(`UPDATE "tweets" SET "content" = '' WHERE "content" IS NULL`);
        await query_runner.query(`ALTER TABLE "tweets" ALTER COLUMN "content" TYPE text`);
        await query_runner.query(`ALTER TABLE "tweets" ALTER COLUMN "content" SET NOT NULL`);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "tweets" ALTER COLUMN "content" DROP NOT NULL`);
        await query_runner.query(
            `ALTER TABLE "tweets" ALTER COLUMN "content" TYPE character varying(280)`
        );
        await query_runner.query(`ALTER TABLE "tweets" DROP COLUMN "num_replies"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "following"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "followers"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "online"`);
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "country"`);
        await query_runner.query(
            `ALTER TABLE "user" ADD "role" character varying NOT NULL DEFAULT 'user'`
        );
        await query_runner.query(`ALTER TABLE "user" ADD "gender" character varying`);
    }
}
