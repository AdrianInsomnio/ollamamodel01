-- Migration: add_clinics_and_align_schema
-- Fecha: 2026-06-05
-- Motivo: el schema.prisma declara `model Clinic` y `clinicId` en multiples
--         tablas, pero la migration inicial (20260413130900) no las creo.
--         Esto causa que Prisma devuelva errores en runtime al consultar
--         `prisma.clinic.*` o al insertar registros con `clinicId`.
--
-- Esta migration es idempotente: cada CREATE usa IF NOT EXISTS y los
-- ALTER usan INFORMATION_SCHEMA para no fallar si la columna/indice ya
-- existe. Asi la podemos aplicar tanto a `ollmodel` (que tiene clinics y
-- la mayoria de las columnas) como a `ollmodel_test` (que no tiene nada).
--
-- IMPORTANTE: clinicId en la mayoria de las tablas tiene
--   ON DELETE SET NULL
-- para no perder datos historicos al eliminar una clinica.

-- 1) Crear tabla Clinic
CREATE TABLE IF NOT EXISTS `clinics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'America/Montevideo',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `organizationId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `clinics_organizationId_idx` (`organizationId`),
  CONSTRAINT `clinics_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Backfill: para cada Organization existente, crear una clinica default
--    si todavia no tiene ninguna. Esto evita que las relaciones se rompan
--    al insertar registros con clinicId NOT NULL en tablas donde deberia
--    ser opcional (en nuestro schema todas son opcionales, pero por las
--    dudas).
INSERT INTO `clinics` (`name`, `address`, `phone`, `email`, `timezone`, `isActive`, `isDefault`, `organizationId`, `createdAt`, `updatedAt`)
SELECT
  CONCAT(o.name, ' (Principal)') AS name,
  o.address,
  o.phone,
  o.email,
  COALESCE(o.timezone, 'America/Montevideo') AS timezone,
  1 AS isActive,
  1 AS isDefault,
  o.id AS organizationId,
  NOW(3) AS createdAt,
  NOW(3) AS updatedAt
FROM `organization` o
LEFT JOIN `clinics` c ON c.organizationId = o.id
WHERE c.id IS NULL;

-- 3) Helper: procedimiento para agregar `clinicId` a una tabla si no existe.
--    Como MySQL 8.0 no tiene `ADD COLUMN IF NOT EXISTS` nativo, lo
--    implementamos via stored procedure.
DROP PROCEDURE IF EXISTS add_clinic_id_column;
DELIMITER //
CREATE PROCEDURE add_clinic_id_column(IN tbl VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tbl
      AND COLUMN_NAME = 'clinicId'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `clinicId` int DEFAULT NULL');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_clinic_id_column('appointment');
CALL add_clinic_id_column('client');
CALL add_clinic_id_column('consultation');
CALL add_clinic_id_column('pet');
CALL add_clinic_id_column('products');
CALL add_clinic_id_column('sale');
CALL add_clinic_id_column('services');
CALL add_clinic_id_column('users');

DROP PROCEDURE add_clinic_id_column;

-- 4) Helper para agregar el FK constraint si no existe.
DROP PROCEDURE IF EXISTS add_clinic_fk;
DELIMITER //
CREATE PROCEDURE add_clinic_fk(IN tbl VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tbl
      AND CONSTRAINT_NAME = CONCAT(tbl, '_clinicId_fkey')
  ) THEN
    SET @sql = CONCAT(
      'ALTER TABLE `', tbl, '` ',
      'ADD CONSTRAINT `', tbl, '_clinicId_fkey` ',
      'FOREIGN KEY (`clinicId`) REFERENCES `clinics` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_clinic_fk('appointment');
CALL add_clinic_fk('client');
CALL add_clinic_fk('consultation');
CALL add_clinic_fk('pet');
CALL add_clinic_fk('products');
CALL add_clinic_fk('sale');
CALL add_clinic_fk('services');
CALL add_clinic_fk('users');

DROP PROCEDURE add_clinic_fk;

-- 5) Helper para crear el indice si no existe.
DROP PROCEDURE IF EXISTS add_clinic_idx;
DELIMITER //
CREATE PROCEDURE add_clinic_idx(IN tbl VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tbl
      AND INDEX_NAME = CONCAT(tbl, '_clinicId_fkey')
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', tbl, '_clinicId_fkey` (`clinicId`)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_clinic_idx('appointment');
CALL add_clinic_idx('client');
CALL add_clinic_idx('consultation');
CALL add_clinic_idx('pet');
CALL add_clinic_idx('products');
CALL add_clinic_idx('sale');
CALL add_clinic_idx('services');
CALL add_clinic_idx('users');

DROP PROCEDURE add_clinic_idx;
