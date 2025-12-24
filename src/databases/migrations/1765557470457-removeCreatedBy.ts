import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCreatedBy1765557470457 implements MigrationInterface {
    name = 'RemoveCreatedBy1765557470457';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "hashtag" DROP CONSTRAINT "FK_11c8b3519f62b36dd5385c217d3"`
        );

        await query_runner.query(`ALTER TABLE "hashtag" DROP COLUMN "created_by"`);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "hashtag" ADD "created_by" uuid`);

        await query_runner.query(
            `ALTER TABLE "hashtag" ADD CONSTRAINT "FK_11c8b3519f62b36dd5385c217d3" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
