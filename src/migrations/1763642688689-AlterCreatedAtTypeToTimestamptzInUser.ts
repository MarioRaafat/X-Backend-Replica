import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCreatedAtTypeToTimestamptzInUser1763642688689 implements MigrationInterface {
    name = 'AlterCreatedAtTypeToTimestamptzInUser1763642688689';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user_follows" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user_follows" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "user_blocks" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user_blocks" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "user_mutes" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user_mutes" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user_mutes" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user_mutes" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "user_blocks" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user_blocks" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await query_runner.query(`ALTER TABLE "user_follows" DROP COLUMN "created_at"`);
        await query_runner.query(
            `ALTER TABLE "user_follows" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`
        );
    }
}
