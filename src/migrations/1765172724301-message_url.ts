import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessageUrl1765172724301 implements MigrationInterface {
    name = 'MessageUrl1765172724301';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "messages" ADD "image_url" text`);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "messages" DROP COLUMN "image_url"`);
    }
}
