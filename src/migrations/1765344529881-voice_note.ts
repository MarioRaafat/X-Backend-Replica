import { MigrationInterface, QueryRunner } from 'typeorm';

export class VoiceNote1765344529881 implements MigrationInterface {
    name = 'VoiceNote1765344529881';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(`ALTER TABLE "messages" ADD "voice_note_url" text`);
        await query_runner.query(`ALTER TABLE "messages" ADD "voice_note_duration" text`);
        await query_runner.query(
            `ALTER TYPE "public"."messages_message_type_enum" RENAME TO "messages_message_type_enum_old"`
        );
        await query_runner.query(
            `CREATE TYPE "public"."messages_message_type_enum" AS ENUM('text', 'reply', 'voice')`
        );
        await query_runner.query(`ALTER TABLE "messages" ALTER COLUMN "message_type" DROP DEFAULT`);
        await query_runner.query(
            `ALTER TABLE "messages" ALTER COLUMN "message_type" TYPE "public"."messages_message_type_enum" USING "message_type"::"text"::"public"."messages_message_type_enum"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ALTER COLUMN "message_type" SET DEFAULT 'text'`
        );
        await query_runner.query(`DROP TYPE "public"."messages_message_type_enum_old"`);
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `CREATE TYPE "public"."messages_message_type_enum_old" AS ENUM('text', 'reply')`
        );
        await query_runner.query(`ALTER TABLE "messages" ALTER COLUMN "message_type" DROP DEFAULT`);
        await query_runner.query(
            `ALTER TABLE "messages" ALTER COLUMN "message_type" TYPE "public"."messages_message_type_enum_old" USING "message_type"::"text"::"public"."messages_message_type_enum_old"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ALTER COLUMN "message_type" SET DEFAULT 'text'`
        );
        await query_runner.query(`DROP TYPE "public"."messages_message_type_enum"`);
        await query_runner.query(
            `ALTER TYPE "public"."messages_message_type_enum_old" RENAME TO "messages_message_type_enum"`
        );
        await query_runner.query(`ALTER TABLE "messages" DROP COLUMN "voice_note_duration"`);
        await query_runner.query(`ALTER TABLE "messages" DROP COLUMN "voice_note_url"`);
    }
}
