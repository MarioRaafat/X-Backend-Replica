import { MigrationInterface, QueryRunner } from 'typeorm';

export class Mentions1765447556136 implements MigrationInterface {
    name = 'Mentions1765447556136';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "tweets" ADD "mentions" text array NOT NULL DEFAULT '{}'`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "tweets" DROP COLUMN "mentions"`);
    }
}
