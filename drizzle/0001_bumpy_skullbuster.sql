CREATE TABLE "feedback_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"review_request_id" text NOT NULL,
	"rating" integer NOT NULL,
	"message" text,
	"customer_email" text,
	"emailed_merchant" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_status" (
	"id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"entity_id" text,
	"result" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"place_id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"title" text NOT NULL,
	"address" text,
	"phone" text,
	"website" text,
	"total_score" real DEFAULT 0,
	"reviews_count" integer DEFAULT 0,
	"image_url" text,
	"review_filters" jsonb DEFAULT '{"sortBy":"most_recent","reviewFilter":"all","filterKeywords":[]}'::jsonb,
	"last_review_fetch_at" timestamp,
	"last_manual_refresh_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_collection_settings" (
	"shop" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"trigger" text DEFAULT 'orders/fulfilled' NOT NULL,
	"delay_days" integer DEFAULT 5 NOT NULL,
	"rating_type" text DEFAULT 'stars' NOT NULL,
	"threshold" integer DEFAULT 4 NOT NULL,
	"place_id" text,
	"followup_enabled" boolean DEFAULT true NOT NULL,
	"followup_delay_days" integer DEFAULT 3 NOT NULL,
	"max_followups" integer DEFAULT 1 NOT NULL,
	"notify_merchant_on_low_rating" boolean DEFAULT true NOT NULL,
	"merchant_email" text,
	"from_name" text,
	"subject" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"order_id" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_name" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"rating" integer,
	"send_job_id" text,
	"followup_job_ids" jsonb DEFAULT '[]'::jsonb,
	"followups_sent" integer DEFAULT 0 NOT NULL,
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_requests_shop_order_uq" UNIQUE("shop","order_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"review_id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"place_id" text NOT NULL,
	"text" text,
	"name" text,
	"stars" real DEFAULT 0,
	"published_at_date" timestamp,
	"reviewer_photo_url" text,
	"review_image_urls" jsonb DEFAULT '[]'::jsonb,
	"hidden" boolean DEFAULT false,
	"filtered" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_preferences" (
	"shop" text PRIMARY KEY NOT NULL,
	"email" text,
	"app_gid" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"shop" text NOT NULL,
	"widget_style" text NOT NULL,
	"widget_html_tag" text NOT NULL,
	"location_place_id" text,
	"display_settings" jsonb DEFAULT '{}'::jsonb,
	"custom_css" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_review_request_id_review_requests_id_fk" FOREIGN KEY ("review_request_id") REFERENCES "public"."review_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_place_id_locations_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."locations"("place_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_submissions_shop_idx" ON "feedback_submissions" USING btree ("shop");--> statement-breakpoint
CREATE INDEX "job_status_shop_idx" ON "job_status" USING btree ("shop");--> statement-breakpoint
CREATE INDEX "job_status_status_idx" ON "job_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "locations_shop_idx" ON "locations" USING btree ("shop");--> statement-breakpoint
CREATE INDEX "review_requests_shop_idx" ON "review_requests" USING btree ("shop");--> statement-breakpoint
CREATE INDEX "review_requests_status_idx" ON "review_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_shop_idx" ON "reviews" USING btree ("shop");--> statement-breakpoint
CREATE INDEX "reviews_place_id_idx" ON "reviews" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "reviews_published_at_idx" ON "reviews" USING btree ("published_at_date");--> statement-breakpoint
CREATE INDEX "widget_settings_shop_idx" ON "widget_settings" USING btree ("shop");