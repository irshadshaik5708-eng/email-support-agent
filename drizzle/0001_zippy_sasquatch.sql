CREATE TABLE `emailReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`subject` varchar(255),
	`emailText` text NOT NULL,
	`category` varchar(64) NOT NULL,
	`sentiment` varchar(32) NOT NULL,
	`urgency` varchar(32) NOT NULL,
	`confidence` int NOT NULL,
	`draftText` text NOT NULL,
	`knowledgeContext` text NOT NULL,
	`status` enum('in_review','approved','rejected','escalated','sent_simulated') NOT NULL DEFAULT 'in_review',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `emailReviews` ADD CONSTRAINT `emailReviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;