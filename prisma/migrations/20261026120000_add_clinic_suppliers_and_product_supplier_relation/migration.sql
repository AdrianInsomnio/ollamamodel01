CREATE TABLE `suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `rut` VARCHAR(50) NULL,
    `contactName` VARCHAR(191) NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `clinic_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_clinic_id_name_key`(`clinic_id`, `name`),
    UNIQUE INDEX `suppliers_clinic_id_rut_key`(`clinic_id`, `rut`),
    UNIQUE INDEX `suppliers_id_clinic_id_key`(`id`, `clinic_id`),
    INDEX `suppliers_clinic_id_is_active_idx`(`clinic_id`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `products`
    ADD COLUMN `supplier_id` INTEGER NULL,
    ADD COLUMN `unit` VARCHAR(50) NULL,
    ADD COLUMN `activeIngredient` VARCHAR(191) NULL,
    ADD COLUMN `concentration` VARCHAR(191) NULL,
    ADD COLUMN `dosageForm` VARCHAR(100) NULL,
    ADD COLUMN `laboratory` VARCHAR(191) NULL,
    ADD COLUMN `indicatedSpecies` VARCHAR(191) NULL,
    ADD COLUMN `administrationRoute` VARCHAR(100) NULL,
    ADD COLUMN `requiresPrescription` BOOLEAN NULL,
    ADD INDEX `products_supplier_id_clinic_id_idx`(`supplier_id`, `clinicId`);

ALTER TABLE `suppliers`
    ADD CONSTRAINT `suppliers_clinic_id_fkey`
    FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `products`
    ADD CONSTRAINT `products_supplier_clinic_fkey`
    FOREIGN KEY (`supplier_id`, `clinicId`) REFERENCES `suppliers`(`id`, `clinic_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
