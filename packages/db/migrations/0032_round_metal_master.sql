CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('open', 'closed', 'draft');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('Full-time', 'Part-time', 'Contract', 'Internship');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100) DEFAULT 'Product' NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"read_time_minutes" integer DEFAULT 5 NOT NULL,
	"author_name" varchar(255) DEFAULT 'Xenboox Team' NOT NULL,
	"author_role" varchar(255) DEFAULT 'Product' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image" varchar(500),
	"views" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"department" varchar(100) NOT NULL,
	"location" varchar(255) NOT NULL,
	"type" "job_type" DEFAULT 'Full-time' NOT NULL,
	"salary" varchar(100),
	"description" text NOT NULL,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nice_to_have" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"posted_date" varchar(50) NOT NULL,
	"closing_date" varchar(50),
	"team_size" varchar(100),
	"reports_to" varchar(255),
	"applications" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "job_postings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "blog_posts_status" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_category" ON "blog_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_featured" ON "blog_posts" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "job_postings_status" ON "job_postings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_postings_department" ON "job_postings" USING btree ("department");--> statement-breakpoint
CREATE INDEX "job_postings_location" ON "job_postings" USING btree ("location");--> statement-breakpoint
CREATE INDEX "job_postings_active" ON "job_postings" USING btree ("is_active");