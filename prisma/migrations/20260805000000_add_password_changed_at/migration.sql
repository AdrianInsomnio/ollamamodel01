ALTER TABLE `users`
ADD COLUMN `passwordChangedAt` DATETIME NULL AFTER `lastLogin`;
