ALTER TABLE `consultations`
    ADD COLUMN `veterinarianId` INTEGER NULL,
    ADD INDEX `Consultation_clinicId_veterinarianId_createdAt_idx` (`clinicId`, `veterinarianId`, `createdAt`),
    ADD CONSTRAINT `Consultation_veterinarianId_fkey`
      FOREIGN KEY (`veterinarianId`) REFERENCES `users`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `veterinarian_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `veterinarianId` INTEGER NOT NULL,
    `clinicId` INTEGER NOT NULL,
    `consultationId` INTEGER NULL,
    `consultorioId` INTEGER NULL,
    `action` VARCHAR(64) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `veterinarian_activities_veterinarianId_clinicId_createdAt_idx` (`veterinarianId`, `clinicId`, `createdAt`),
    INDEX `veterinarian_activities_consultationId_idx` (`consultationId`),
    INDEX `veterinarian_activities_clinicId_idx` (`clinicId`),
    INDEX `veterinarian_activities_consultorioId_idx` (`consultorioId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `veterinarian_activities_veterinarianId_fkey`
      FOREIGN KEY (`veterinarianId`) REFERENCES `users`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `veterinarian_activities_clinicId_fkey`
      FOREIGN KEY (`clinicId`) REFERENCES `clinics`(`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `veterinarian_activities_consultationId_fkey`
      FOREIGN KEY (`consultationId`) REFERENCES `consultations`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `veterinarian_activities_consultorioId_fkey`
      FOREIGN KEY (`consultorioId`) REFERENCES `consultorios`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
