CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`memo` text,
	`date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
