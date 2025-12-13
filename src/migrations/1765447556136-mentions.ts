import { MigrationInterface, QueryRunner } from 'typeorm';

export class Mentions1765447556136 implements MigrationInterface {
    name = 'Mentions1765447556136';

    public async up(query_runner: QueryRunner): Promise<void> {
        // Check if the column already exists
        const table = await query_runner.getTable('tweets');
        const mentions_column = table?.columns.find((col) => col.name === 'mentions');

        if (!mentions_column) {
            await query_runner.query(
                `ALTER TABLE "tweets" ADD "mentions" text array NOT NULL DEFAULT '{}'`
            );
        }
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        // Check if the column exists before dropping
        const table = await query_runner.getTable('tweets');
        const mentions_column = table?.columns.find((col) => col.name === 'mentions');

        if (mentions_column) {
            await query_runner.query(`ALTER TABLE "tweets" DROP COLUMN "mentions"`);
        }
    }
}
