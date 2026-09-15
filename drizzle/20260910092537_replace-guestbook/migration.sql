SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
SET LOCAL statement_timeout = '30s';
--> statement-breakpoint
CREATE TABLE "guestbook_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp(3) with time zone,
	"submission_key" text NOT NULL UNIQUE,
	CONSTRAINT "guestbook_name_length" CHECK (char_length(btrim("name")) between 1 and 80),
	CONSTRAINT "guestbook_message_length" CHECK (char_length(btrim("message")) between 1 and 500)
);
--> statement-breakpoint
-- Only the retired globe table is removed. No CASCADE or schema reset.
DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages'
        AND column_name IN ('id', 'name', 'message', 'latitude', 'longitude', 'country', 'city', 'created_at')) <> 8 THEN
      RAISE EXCEPTION 'public.messages does not match the retired guestbook; inspect before migrating';
    END IF;
    DROP TABLE public.messages;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX "guestbook_messages_visible_created_id_idx" ON "guestbook_messages" ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "hidden_at" is null;