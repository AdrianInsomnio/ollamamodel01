-- FASE 1: planes veterinarios, suscripciones, mascotas cubiertas y cuotas.
-- Esta migración no modifica el sistema comercial Plan/Subscription.

CREATE TABLE `medical_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `benefits` JSON NOT NULL,
    `periodicity` ENUM('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
    `maxPets` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `applyLateFee` BOOLEAN NOT NULL DEFAULT false,
    `lateFeeType` ENUM('NONE', 'FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'NONE',
    `lateFeeValue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clinicId` INTEGER NOT NULL,

    INDEX `medical_plans_clinicId_status_idx`(`clinicId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `client_subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `medicalPlanId` INTEGER NOT NULL,
    `clientId` INTEGER NOT NULL,
    `clinicId` INTEGER NOT NULL,
    `contractedPrice` DECIMAL(12, 2) NOT NULL,
    `periodicity` ENUM('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL') NOT NULL,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `nextDueDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `suspensionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `client_subscriptions_clientId_idx`(`clientId`),
    INDEX `client_subscriptions_clinicId_clientId_idx`(`clinicId`, `clientId`),
    INDEX `client_subscriptions_clinicId_status_idx`(`clinicId`, `status`),
    INDEX `client_subscriptions_medicalPlanId_idx`(`medicalPlanId`),
    INDEX `client_subscriptions_nextDueDate_idx`(`nextDueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `client_subscription_pets` (
    `subscriptionId` INTEGER NOT NULL,
    `petId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_subscription_pets_petId_idx`(`petId`),
    PRIMARY KEY (`subscriptionId`, `petId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `subscription_installments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriptionId` INTEGER NOT NULL,
    `clinicId` INTEGER NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `lateFee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `saleId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscription_installments_subscription_period_key`(`subscriptionId`, `periodStart`, `periodEnd`),
    INDEX `subscription_installments_clinic_status_dueDate_idx`(`clinicId`, `status`, `dueDate`),
    INDEX `subscription_installments_subscription_dueDate_idx`(`subscriptionId`, `dueDate`),
    INDEX `subscription_installments_saleId_idx`(`saleId`),
    INDEX `subscription_installments_paidAt_idx`(`paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `medical_plans`
    ADD CONSTRAINT `medical_plans_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `client_subscriptions`
    ADD CONSTRAINT `client_subscriptions_medicalPlanId_fkey`
    FOREIGN KEY (`medicalPlanId`) REFERENCES `medical_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `client_subscriptions_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `client_subscriptions_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `client_subscription_pets`
    ADD CONSTRAINT `client_subscription_pets_subscriptionId_fkey`
    FOREIGN KEY (`subscriptionId`) REFERENCES `client_subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `client_subscription_pets_petId_fkey`
    FOREIGN KEY (`petId`) REFERENCES `pets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `subscription_installments`
    ADD CONSTRAINT `subscription_installments_subscriptionId_fkey`
    FOREIGN KEY (`subscriptionId`) REFERENCES `client_subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `subscription_installments_clinicId_fkey`
    FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `subscription_installments_saleId_fkey`
    FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
