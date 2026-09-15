ALTER TABLE `products`
    ADD COLUMN `ivaIncluded` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `sale_items`
    ADD COLUMN `unitPrice` DOUBLE NULL,
    ADD COLUMN `ivaIncluded` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `ivaRate` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `netAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `taxAmount` DOUBLE NOT NULL DEFAULT 0;

UPDATE `sale_items`
SET `unitPrice` = `priceSnapshot`,
    `netAmount` = `subtotal`;

UPDATE `products`
SET `ivaIncluded` = true;
