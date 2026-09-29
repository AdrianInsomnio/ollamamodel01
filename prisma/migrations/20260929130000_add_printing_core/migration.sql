-- Printing Core Fase 2: schema mínimo multiempresa/multiubicación.
-- No reemplaza el registro legacy ticket_prints.

CREATE TABLE `print_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `print_locations_clinicId_code_key`(`clinicId`, `code`),
    INDEX `print_locations_clinicId_idx`(`clinicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `print_agents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `locationId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NULL,
    `apiKeyHash` VARCHAR(255) NULL,
    `status` ENUM('ONLINE', 'OFFLINE', 'DEGRADED') NOT NULL DEFAULT 'OFFLINE',
    `lastSeenAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `print_agents_clinicId_idx`(`clinicId`),
    INDEX `print_agents_locationId_idx`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `printer_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `printerType` ENUM('THERMAL', 'SHEET', 'OTHER') NOT NULL,
    `paperTypes` JSON NOT NULL,
    `capabilities` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `printer_profiles_clinicId_name_key`(`clinicId`, `name`),
    INDEX `printer_profiles_clinicId_idx`(`clinicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `printers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `locationId` INTEGER NOT NULL,
    `printAgentId` INTEGER NULL,
    `profileId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `printerType` ENUM('THERMAL', 'SHEET', 'OTHER') NOT NULL,
    `paperType` ENUM('THERMAL', 'SHEET') NOT NULL,
    `paperSize` ENUM('THERMAL_58', 'THERMAL_80', 'A4', 'LETTER', 'A5', 'LEGAL', 'CUSTOM') NOT NULL,
    `orientation` ENUM('PORTRAIT', 'LANDSCAPE') NOT NULL DEFAULT 'PORTRAIT',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `printers_clinicId_name_key`(`clinicId`, `name`),
    INDEX `printers_clinicId_idx`(`clinicId`),
    INDEX `printers_locationId_idx`(`locationId`),
    INDEX `printers_printAgentId_idx`(`printAgentId`),
    INDEX `printers_profileId_idx`(`profileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `print_targets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `locationId` INTEGER NOT NULL,
    `printerId` INTEGER NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `print_targets_clinicId_code_key`(`clinicId`, `code`),
    INDEX `print_targets_clinicId_idx`(`clinicId`),
    INDEX `print_targets_locationId_idx`(`locationId`),
    INDEX `print_targets_printerId_idx`(`printerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `print_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `templateKey` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `print_templates_clinicId_templateKey_key`(`clinicId`, `templateKey`),
    INDEX `print_templates_clinicId_idx`(`clinicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `print_template_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `templateId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `paperType` ENUM('THERMAL', 'SHEET') NOT NULL,
    `paperSize` ENUM('THERMAL_58', 'THERMAL_80', 'A4', 'LETTER', 'A5', 'LEGAL', 'CUSTOM') NOT NULL,
    `orientation` ENUM('PORTRAIT', 'LANDSCAPE') NOT NULL DEFAULT 'PORTRAIT',
    `definition` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `print_template_versions_templateId_version_key`(`templateId`, `version`),
    INDEX `print_template_versions_templateId_status_idx`(`templateId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `print_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `print_assets_clinicId_storageKey_key`(`clinicId`, `storageKey`),
    INDEX `print_assets_clinicId_idx`(`clinicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `print_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `requestedById` INTEGER NULL,
    `originalBatchId` INTEGER NULL,
    `sourceDocumentType` VARCHAR(191) NOT NULL,
    `sourceDocumentId` VARCHAR(191) NOT NULL,
    `variant` ENUM('ORIGINAL', 'DUPLICATE', 'COPY', 'PREVIEW') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `print_batches_clinicId_createdAt_idx`(`clinicId`, `createdAt`),
    INDEX `print_batches_requestedById_idx`(`requestedById`),
    INDEX `print_batches_originalBatchId_idx`(`originalBatchId`),
    INDEX `print_batches_sourceDocumentType_sourceDocumentId_idx`(`sourceDocumentType`, `sourceDocumentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `print_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `batchId` INTEGER NOT NULL,
    `originalJobId` INTEGER NULL,
    `targetId` INTEGER NULL,
    `printerId` INTEGER NULL,
    `printAgentId` INTEGER NULL,
    `templateVersionId` INTEGER NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `documentNumber` VARCHAR(191) NULL,
    `variant` ENUM('ORIGINAL', 'DUPLICATE', 'COPY', 'PREVIEW') NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'PRINTED', 'FAILED', 'RETRYING', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `contractVersion` INTEGER NOT NULL DEFAULT 1,
    `contractSnapshot` JSON NOT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `printedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `print_jobs_clinicId_status_idx`(`clinicId`, `status`),
    INDEX `print_jobs_batchId_idx`(`batchId`),
    INDEX `print_jobs_originalJobId_idx`(`originalJobId`),
    INDEX `print_jobs_targetId_idx`(`targetId`),
    INDEX `print_jobs_printerId_idx`(`printerId`),
    INDEX `print_jobs_printAgentId_idx`(`printAgentId`),
    INDEX `print_jobs_templateVersionId_idx`(`templateVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `print_locations`
    ADD CONSTRAINT `print_locations_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `print_agents`
    ADD CONSTRAINT `print_agents_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `print_agents_locationId_fkey`
    FOREIGN KEY (`locationId`) REFERENCES `print_locations`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `printer_profiles`
    ADD CONSTRAINT `printer_profiles_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `printers`
    ADD CONSTRAINT `printers_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `printers_locationId_fkey`
    FOREIGN KEY (`locationId`) REFERENCES `print_locations`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `printers_printAgentId_fkey`
    FOREIGN KEY (`printAgentId`) REFERENCES `print_agents`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `printers_profileId_fkey`
    FOREIGN KEY (`profileId`) REFERENCES `printer_profiles`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `print_targets`
    ADD CONSTRAINT `print_targets_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `print_targets_locationId_fkey`
    FOREIGN KEY (`locationId`) REFERENCES `print_locations`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `print_targets_printerId_fkey`
    FOREIGN KEY (`printerId`) REFERENCES `printers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `print_templates`
    ADD CONSTRAINT `print_templates_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `print_template_versions`
    ADD CONSTRAINT `print_template_versions_templateId_fkey`
    FOREIGN KEY (`templateId`) REFERENCES `print_templates`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `print_assets`
    ADD CONSTRAINT `print_assets_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `print_batches`
    ADD CONSTRAINT `print_batches_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `print_batches_requestedById_fkey`
    FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `print_batches_originalBatchId_fkey`
    FOREIGN KEY (`originalBatchId`) REFERENCES `print_batches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `print_jobs`
    ADD CONSTRAINT `print_jobs_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `print_jobs_batchId_fkey`
    FOREIGN KEY (`batchId`) REFERENCES `print_batches`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `print_jobs_originalJobId_fkey`
    FOREIGN KEY (`originalJobId`) REFERENCES `print_jobs`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `print_jobs_targetId_fkey`
    FOREIGN KEY (`targetId`) REFERENCES `print_targets`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `print_jobs_printerId_fkey`
    FOREIGN KEY (`printerId`) REFERENCES `printers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `print_jobs_printAgentId_fkey`
    FOREIGN KEY (`printAgentId`) REFERENCES `print_agents`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `print_jobs_templateVersionId_fkey`
    FOREIGN KEY (`templateVersionId`) REFERENCES `print_template_versions`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
