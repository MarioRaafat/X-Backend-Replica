import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditTweetTimestamp1763999079306 implements MigrationInterface {
    name = 'EditTweetTimestamp1763999079306';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "tweets" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweets" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "tweets" DROP COLUMN "updated_at"`);
        await query_runner.query(
            `ALTER TABLE "tweets" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "tweets" DROP COLUMN "updated_at"`);
        await query_runner.query(
            `ALTER TABLE "tweets" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "tweets" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "tweets" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
    }
}
