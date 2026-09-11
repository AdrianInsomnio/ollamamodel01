-- Caja V1: pagos directos a ventas, historial de impresiones y auditoria.

-- Payment puede existir sin documento fiscal durante esta fase.
ALTER TABLE `payments` DROP FOREIGN KEY `Payment_fiscalDocumentId_fkey`;

ALTER TABLE `payments`
    ADD COLUMN `saleId` INTEGER NULL,
    MODIFY `fiscalDocumentId` VARCHAR(191) NULL;

CREATE TABLE `ticket_prints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `clinicId` INTEGER NOT NULL,
    `cashShiftId` INTEGER NULL,
    `cashRegisterId` INTEGER NULL,
    `type` ENUM('ORIGINAL', 'DUPLICATE') NOT NULL,
    `reprintNumber` INTEGER NOT NULL DEFAULT 0,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_prints_saleId_idx`(`saleId`),
    INDEX `ticket_prints_clinicId_idx`(`clinicId`),
    INDEX `ticket_prints_userId_idx`(`userId`),
    INDEX `ticket_prints_cashShiftId_idx`(`cashShiftId`),
    INDEX `ticket_prints_cashRegisterId_idx`(`cashRegisterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cash_audit_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `clinicId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `cashRegisterId` INTEGER NULL,
    `cashShiftId` INTEGER NULL,
    `saleId` INTEGER NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cash_audit_events_clinicId_idx`(`clinicId`),
    INDEX `cash_audit_events_userId_idx`(`userId`),
    INDEX `cash_audit_events_cashRegisterId_idx`(`cashRegisterId`),
    INDEX `cash_audit_events_cashShiftId_idx`(`cashShiftId`),
    INDEX `cash_audit_events_saleId_idx`(`saleId`),
    INDEX `cash_audit_events_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `payments_saleId_idx` ON `payments`(`saleId`);

ALTER TABLE `payments`
    ADD CONSTRAINT `Payment_fiscalDocumentId_fkey`
    FOREIGN KEY (`fiscalDocumentId`) REFERENCES `fiscal_documents`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payments`
    ADD CONSTRAINT `payments_saleId_fkey`
    FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ticket_prints`
    ADD CONSTRAINT `ticket_prints_saleId_fkey`
    FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ticket_prints_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ticket_prints_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ticket_prints_cashShiftId_fkey`
    FOREIGN KEY (`cashShiftId`) REFERENCES `cash_shifts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `ticket_prints_cashRegisterId_fkey`
    FOREIGN KEY (`cashRegisterId`) REFERENCES `cash_registers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `cash_audit_events`
    ADD CONSTRAINT `cash_audit_events_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `cash_audit_events_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `cash_audit_events_cashRegisterId_fkey`
    FOREIGN KEY (`cashRegisterId`) REFERENCES `cash_registers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `cash_audit_events_cashShiftId_fkey`
    FOREIGN KEY (`cashShiftId`) REFERENCES `cash_shifts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `cash_audit_events_saleId_fkey`
    FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
