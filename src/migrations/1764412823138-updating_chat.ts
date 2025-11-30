import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatingChat1764412823138 implements MigrationInterface {
    name = 'UpdatingChat1764412823138';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "chats" ADD "last_message_id" uuid`);
        await query_runner.query(
            `ALTER TABLE "chats" ADD "unread_count_user1" integer NOT NULL DEFAULT '0'`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD "unread_count_user2" integer NOT NULL DEFAULT '0'`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_07b7d9dde84f3d2f0403de3bf09" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_07b7d9dde84f3d2f0403de3bf09"`
        );
        await query_runner.query(`ALTER TABLE "chats" DROP COLUMN "unread_count_user2"`);
        await query_runner.query(`ALTER TABLE "chats" DROP COLUMN "unread_count_user1"`);
        await query_runner.query(`ALTER TABLE "chats" DROP COLUMN "last_message_id"`);
    }
}
