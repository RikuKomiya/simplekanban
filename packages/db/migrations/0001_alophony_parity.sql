CREATE TABLE `issue_blocker` (
	`blocked_issue_id` text NOT NULL,
	`blocker_issue_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`blocked_issue_id`, `blocker_issue_id`),
	FOREIGN KEY (`blocked_issue_id`) REFERENCES `issue`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocker_issue_id`) REFERENCES `issue`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `issue_blocker_blocked_issue_id_idx` ON `issue_blocker` (`blocked_issue_id`);
--> statement-breakpoint
CREATE INDEX `issue_blocker_blocker_issue_id_idx` ON `issue_blocker` (`blocker_issue_id`);
--> statement-breakpoint
CREATE TABLE `issue_usage` (
	`issue_id` text PRIMARY KEY NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `api_key` ADD `scopes` text DEFAULT '*' NOT NULL;
