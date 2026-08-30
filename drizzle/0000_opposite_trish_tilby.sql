CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_key` text NOT NULL,
	`type` text NOT NULL,
	`activity_date` text NOT NULL,
	`start_time` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activities_owner_date_idx` ON `activities` (`owner_key`,`activity_date`);--> statement-breakpoint
CREATE INDEX `activities_owner_status_idx` ON `activities` (`owner_key`,`status`);--> statement-breakpoint
CREATE TABLE `weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_key` text NOT NULL,
	`weight` real NOT NULL,
	`measured_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `weights_owner_date_idx` ON `weights` (`owner_key`,`measured_at`);