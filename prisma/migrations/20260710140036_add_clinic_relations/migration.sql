-- CreateTable
CREATE TABLE `_UserClinics` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_UserClinics_AB_unique`(`A`, `B`),
    INDEX `_UserClinics_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PlanUsers` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_PlanUsers_AB_unique`(`A`, `B`),
    INDEX `_PlanUsers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_SubscriptionUsers` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_SubscriptionUsers_AB_unique`(`A`, `B`),
    INDEX `_SubscriptionUsers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_UserClinics` ADD CONSTRAINT `_UserClinics_A_fkey` FOREIGN KEY (`A`) REFERENCES `clinics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserClinics` ADD CONSTRAINT `_UserClinics_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlanUsers` ADD CONSTRAINT `_PlanUsers_A_fkey` FOREIGN KEY (`A`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlanUsers` ADD CONSTRAINT `_PlanUsers_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SubscriptionUsers` ADD CONSTRAINT `_SubscriptionUsers_A_fkey` FOREIGN KEY (`A`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SubscriptionUsers` ADD CONSTRAINT `_SubscriptionUsers_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
