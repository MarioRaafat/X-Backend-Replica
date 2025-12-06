import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSoftDelete1765045872038 implements MigrationInterface {
    name = 'AddUserSoftDelete1765045872038';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user" ADD "deleted_at" TIMESTAMP`);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "deleted_at"`);
    }
}
