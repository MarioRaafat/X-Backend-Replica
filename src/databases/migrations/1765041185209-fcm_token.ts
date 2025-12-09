import { MigrationInterface, QueryRunner } from 'typeorm';

export class FcmToken1765041185209 implements MigrationInterface {
    name = 'FcmToken1765041185209';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "user" ADD "fcm_token" character varying`);
        await query_runner.query(
            `ALTER TABLE "user" ADD CONSTRAINT "UQ_42ec3185b3e2808da76fa32e140" UNIQUE ("fcm_token")`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "user" DROP CONSTRAINT "UQ_42ec3185b3e2808da76fa32e140"`
        );
        await query_runner.query(`ALTER TABLE "user" DROP COLUMN "fcm_token"`);
    }
}
