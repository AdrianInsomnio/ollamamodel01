-- Drop DEFAULT CURRENT_TIMESTAMP(3) on clinics.updatedAt to align schema (@updatedAt only) with DB.
-- This is a no-op for application logic since Prisma always sends updatedAt explicitly on UPDATE.
-- See commit a7e9ad5 for the schema-side change.

ALTER TABLE `clinics` ALTER COLUMN `updatedAt` DROP DEFAULT;
