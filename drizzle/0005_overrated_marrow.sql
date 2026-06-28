CREATE TABLE "review_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"day" text NOT NULL,
	"total_reviews" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_snapshots_shop_day_uq" UNIQUE("shop","day")
);
--> statement-breakpoint
CREATE INDEX "review_snapshots_shop_idx" ON "review_snapshots" USING btree ("shop");