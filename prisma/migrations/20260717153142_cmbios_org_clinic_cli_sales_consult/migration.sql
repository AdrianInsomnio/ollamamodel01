/*
  Warnings:

  - You are about to drop the column `organizationId` on the `appointment` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `client` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosis` on the `consultation` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `consultation` table. All the data in the column will be lost.
  - You are about to drop the column `treatment` on the `consultation` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `pet` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `product_categories` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `sale` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `services` table. All the data in the column will be lost.
  - You are about to drop the `_planusers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `clinicId` to the `appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `consultation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_planusers` DROP FOREIGN KEY `_PlanUsers_A_fkey`;

-- DropForeignKey
ALTER TABLE `_planusers` DROP FOREIGN KEY `_PlanUsers_B_fkey`;

-- DropForeignKey
ALTER TABLE `appointment` DROP FOREIGN KEY `Appointment_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `client` DROP FOREIGN KEY `Client_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `consultation` DROP FOREIGN KEY `Consultation_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `pet` DROP FOREIGN KEY `Pet_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `plans` DROP FOREIGN KEY `plans_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `services` DROP FOREIGN KEY `services_organizationId_fkey`;

-- DropIndex
DROP INDEX `Appointment_organizationId_fkey` ON `appointment`;

-- DropIndex
DROP INDEX `Client_organizationId_fkey` ON `client`;

-- DropIndex
DROP INDEX `Consultation_organizationId_fkey` ON `consultation`;

-- DropIndex
DROP INDEX `Pet_organizationId_fkey` ON `pet`;

-- DropIndex
DROP INDEX `plans_organizationId_fkey` ON `plans`;

-- DropIndex
DROP INDEX `products_organizationId_fkey` ON `products`;

-- DropIndex
DROP INDEX `refresh_tokens_organizationId_fkey` ON `refresh_tokens`;

-- DropIndex
DROP INDEX `Sale_organizationId_fkey` ON `sale`;

-- DropIndex
DROP INDEX `services_organizationId_fkey` ON `services`;

-- AlterTable
ALTER TABLE `appointment` DROP COLUMN `organizationId`,
    ADD COLUMN `clinicId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `attachment` ADD COLUMN `clinicId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `client` DROP COLUMN `organizationId`,
    ADD COLUMN `clinicId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `consultation` DROP COLUMN `diagnosis`,
    DROP COLUMN `organizationId`,
    DROP COLUMN `treatment`,
    ADD COLUMN `clinicId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `pet` DROP COLUMN `organizationId`,
    ADD COLUMN `birthDateEstimated` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `deathDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `plans` DROP COLUMN `organizationId`;

-- AlterTable
ALTER TABLE `product_categories` DROP COLUMN `organizationId`,
    ADD COLUMN `clinicId` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `organizationId`,
    ADD COLUMN `clinicId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `refresh_tokens` DROP COLUMN `organizationId`,
    ADD COLUMN `clinic_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `sale` DROP COLUMN `organizationId`,
    ADD COLUMN `clinicId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `services` DROP COLUMN `organizationId`,
    ADD COLUMN `clinicId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `_planusers`;

-- CreateTable
CREATE TABLE `medical_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `benefits` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clinicId` INTEGER NOT NULL,

    INDEX `medical_plans_clinicId_idx`(`clinicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `medicalPlanId` INTEGER NOT NULL,
    `clientId` INTEGER NOT NULL,
    `petId` INTEGER NULL,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `client_subscriptions_medicalPlanId_idx`(`medicalPlanId`),
    INDEX `client_subscriptions_clientId_idx`(`clientId`),
    INDEX `client_subscriptions_petId_idx`(`petId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Appointment_clinicId_fkey` ON `appointment`(`clinicId`);

-- CreateIndex
CREATE INDEX `Client_clinicId_fkey` ON `client`(`clinicId`);

-- CreateIndex
CREATE INDEX `Consultation_clinicId_fkey` ON `consultation`(`clinicId`);

-- CreateIndex
CREATE INDEX `products_clinicId_fkey` ON `products`(`clinicId`);

-- CreateIndex
CREATE INDEX `Sale_clinicId_fkey` ON `sale`(`clinicId`);

-- CreateIndex
CREATE INDEX `services_clinicId_fkey` ON `services`(`clinicId`);

-- AddForeignKey
ALTER TABLE `appointment` ADD CONSTRAINT `Appointment_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachment` ADD CONSTRAINT `attachment_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultation` ADD CONSTRAINT `Consultation_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale` ADD CONSTRAINT `sale_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medical_plans` ADD CONSTRAINT `medical_plans_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_subscriptions` ADD CONSTRAINT `client_subscriptions_medicalPlanId_fkey` FOREIGN KEY (`medicalPlanId`) REFERENCES `medical_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_subscriptions` ADD CONSTRAINT `client_subscriptions_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_subscriptions` ADD CONSTRAINT `client_subscriptions_petId_fkey` FOREIGN KEY (`petId`) REFERENCES `pet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `_subscriptionusers` RENAME INDEX `_SubscriptionUsers_AB_unique` TO `_subscriptionusers_AB_unique`;

-- RenameIndex
ALTER TABLE `_subscriptionusers` RENAME INDEX `_SubscriptionUsers_B_index` TO `_subscriptionusers_B_index`;

-- RenameIndex
ALTER TABLE `_userclinics` RENAME INDEX `_UserClinics_AB_unique` TO `_userclinics_AB_unique`;

-- RenameIndex
ALTER TABLE `_userclinics` RENAME INDEX `_UserClinics_B_index` TO `_userclinics_B_index`;
