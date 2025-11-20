import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReplyRestrictions1732070000000 implements MigrationInterface {
    name = 'AddReplyRestrictions1732070000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create reply_restriction enum type
        await queryRunner.query(`
            CREATE TYPE "reply_restriction_enum" AS ENUM ('EVERYONE', 'FOLLOWED', 'MENTIONED', 'VERIFIED')
        `);

        // Add reply_restriction column with default value
        await queryRunner.query(`
            ALTER TABLE "tweets" 
            ADD COLUMN "reply_restriction" "reply_restriction_enum" NOT NULL DEFAULT 'EVERYONE'
        `);

        // Add mentions column as UUID array
        await queryRunner.query(`
            ALTER TABLE "tweets" 
            ADD COLUMN "mentions" uuid[] NOT NULL DEFAULT '{}'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop columns
        await queryRunner.query(`ALTER TABLE "tweets" DROP COLUMN "mentions"`);
        await queryRunner.query(`ALTER TABLE "tweets" DROP COLUMN "reply_restriction"`);

        // Drop enum type
        await queryRunner.query(`DROP TYPE "reply_restriction_enum"`);
    }
}
