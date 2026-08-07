ALTER TABLE `users`
ADD COLUMN `passwordChangedAt` DATETIME NULL AFTER `lastLogin`;


-- NOTA: Esta migración se mantiene intencionalmente. El campo passwordChangedAt en la tabla users se conserva desde la sesión 2026-08-05. No aplicar si ya existe la columna.