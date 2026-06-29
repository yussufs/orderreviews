CREATE TABLE "shop_usage" (
	"shop" text NOT NULL,
	"period" text NOT NULL,
	"emails_sent" integer DEFAULT 0 NOT NULL,
	"over_limit_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_usage_shop_period_pk" PRIMARY KEY("shop","period")
);
--> statement-breakpoint
ALTER TABLE "shop_preferences" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_preferences" ADD COLUMN "plan_interval" text;--> statement-breakpoint
ALTER TABLE "shop_preferences" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "shop_preferences" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "shop_preferences" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "shop_preferences" ADD COLUMN "subscription_updated_at" timestamp;