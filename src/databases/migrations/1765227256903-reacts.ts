import { MigrationInterface, QueryRunner } from 'typeorm';

export class Reacts1765227256903 implements MigrationInterface {
    name = 'Reacts1765227256903';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`
        );
        await query_runner.query(
            `CREATE TABLE "message_reactions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "message_id" uuid NOT NULL, "user_id" uuid NOT NULL, "emoji" character varying(10) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_MESSAGE_USER" UNIQUE ("message_id", "user_id"), CONSTRAINT "PK_654a9f0059ff93a8f156be66a5b" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `CREATE INDEX "IDX_MESSAGE_USER" ON "message_reactions" ("message_id", "user_id") `
        );
        await query_runner.query(
            `ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_ce61e365d81a9dfc15cd36513b0" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_b6d3eda2f99b64016d6a4cf112f" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`
        );
        await query_runner.query(
            `ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_b6d3eda2f99b64016d6a4cf112f"`
        );
        await query_runner.query(
            `ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_ce61e365d81a9dfc15cd36513b0"`
        );
        await query_runner.query(`DROP INDEX "public"."IDX_MESSAGE_USER"`);
        await query_runner.query(`DROP TABLE "message_reactions"`);
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
