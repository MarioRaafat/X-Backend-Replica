import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixChatandBlockMute1765825301002 implements MigrationInterface {
    name = 'FixChatandBlockMute1765825301002';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_a14c79d67133bb0df4a71807a74"`
        );
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a"`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a" FOREIGN KEY ("user1_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_a14c79d67133bb0df4a71807a74" FOREIGN KEY ("user2_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_a14c79d67133bb0df4a71807a74"`
        );
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a"`
        );

        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a" FOREIGN KEY ("user1_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_a14c79d67133bb0df4a71807a74" FOREIGN KEY ("user2_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
