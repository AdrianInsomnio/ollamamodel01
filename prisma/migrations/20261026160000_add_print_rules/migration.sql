CREATE TABLE `print_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `targetId` INTEGER NOT NULL,
    `templateKey` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `print_rules_clinicId_event_idx`(`clinicId`, `event`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `print_rules`
    ADD CONSTRAINT `print_rules_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `print_rules_targetId_fkey`
    FOREIGN KEY (`targetId`) REFERENCES `print_targets`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
