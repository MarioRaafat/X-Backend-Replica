import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatAndMessagesTables1763927953154 implements MigrationInterface {
    name = 'AddChatAndMessagesTables1763927953154';

    public async up(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" DROP CONSTRAINT "FK_tweet_bookmarks_user"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" DROP CONSTRAINT "FK_tweet_bookmarks_tweet"`
        );
        await query_runner.query(`DROP INDEX "public"."IDX_tweet_bookmarks_tweet_id"`);
        await query_runner.query(`DROP INDEX "public"."IDX_tweet_bookmarks_user_id"`);
        await query_runner.query(
            `CREATE TYPE "public"."messages_message_type_enum" AS ENUM('text', 'reply')`
        );
        await query_runner.query(
            `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "content" text NOT NULL, "message_type" "public"."messages_message_type_enum" NOT NULL DEFAULT 'text', "sender_id" uuid NOT NULL, "chat_id" uuid NOT NULL, "reply_to_message_id" uuid, "is_read" boolean NOT NULL DEFAULT false, "is_edited" boolean NOT NULL DEFAULT false, "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `CREATE TABLE "chats" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user1_id" uuid NOT NULL, "user2_id" uuid NOT NULL, "last_message_id" uuid, "unread_count_user1" integer NOT NULL DEFAULT '0', "unread_count_user2" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD CONSTRAINT "FK_51b27a18d137b705c3523bcd336" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD CONSTRAINT "FK_1a295acf3ed6eea0db67b9ce6c3" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "messages" ADD CONSTRAINT "FK_7f87cbb925b1267778a7f4c5d67" FOREIGN KEY ("reply_to_message_id") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a" FOREIGN KEY ("user1_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_a14c79d67133bb0df4a71807a74" FOREIGN KEY ("user2_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "chats" ADD CONSTRAINT "FK_07b7d9dde84f3d2f0403de3bf09" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(query_runner: QueryRunner): Promise<void> {
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_07b7d9dde84f3d2f0403de3bf09"`
        );
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_a14c79d67133bb0df4a71807a74"`
        );
        await query_runner.query(
            `ALTER TABLE "chats" DROP CONSTRAINT "FK_05b8003b6a5c6a9b16cb31fea2a"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_7f87cbb925b1267778a7f4c5d67"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`
        );
        await query_runner.query(
            `ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" DROP CONSTRAINT "FK_1a295acf3ed6eea0db67b9ce6c3"`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" DROP CONSTRAINT "FK_51b27a18d137b705c3523bcd336"`
        );
        await query_runner.query(`DROP TABLE "chats"`);
        await query_runner.query(`DROP TABLE "messages"`);
        await query_runner.query(`DROP TYPE "public"."messages_message_type_enum"`);
        await query_runner.query(
            `CREATE INDEX "IDX_tweet_bookmarks_user_id" ON "tweet_bookmarks" ("user_id") `
        );
        await query_runner.query(
            `CREATE INDEX "IDX_tweet_bookmarks_tweet_id" ON "tweet_bookmarks" ("tweet_id") `
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD CONSTRAINT "FK_tweet_bookmarks_tweet" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("tweet_id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await query_runner.query(
            `ALTER TABLE "tweet_bookmarks" ADD CONSTRAINT "FK_tweet_bookmarks_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }
}
