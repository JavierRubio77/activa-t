CREATE TABLE `activity_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_key` text NOT NULL,
	`name` text NOT NULL,
	`icon_key` text DEFAULT 'sparkles' NOT NULL,
	`color` text DEFAULT '#65a84f' NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_types_owner_name_idx` ON `activity_types` (`owner_key`,`name`);