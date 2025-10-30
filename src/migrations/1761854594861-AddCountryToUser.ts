import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountryToUser1761854594861 implements MigrationInterface {
    name = 'AddCountryToUser1761854594861';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            ALTER TABLE "user" ADD "country" varchar(255)
        `);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`
            ALTER TABLE "user" DROP COLUMN "country"
        `);
    }
}
