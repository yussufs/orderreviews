ALTER TABLE "feedback_submissions" ALTER COLUMN "review_request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "source" text DEFAULT 'order' NOT NULL;