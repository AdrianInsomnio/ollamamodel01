ALTER TABLE `product_categories`
  ADD COLUMN `category_type` VARCHAR(32) NOT NULL DEFAULT 'PRODUCTO';

UPDATE `product_categories` AS category
SET `category_type` = 'FARMACIA'
WHERE LOWER(`category`.`name`) REGEXP 'farmacia|medicamento|medicina';

UPDATE `product_categories` AS category
SET `category_type` = 'SERVICIO'
WHERE `category_type` = 'PRODUCTO'
  AND EXISTS (
    SELECT 1 FROM `services` AS service
    WHERE service.`clinicId` = category.`clinicId`
      AND LOWER(TRIM(service.`category`)) = LOWER(TRIM(category.`name`))
  )
  AND NOT EXISTS (
    SELECT 1 FROM `products` AS product
    WHERE product.`category_id` = category.`id`
  );

