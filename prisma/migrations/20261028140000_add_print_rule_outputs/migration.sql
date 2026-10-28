ALTER TABLE `print_rules`
    ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `targetId` INTEGER NULL,
    MODIFY `templateKey` VARCHAR(191) NULL;

UPDATE `print_rules`
SET `name` = CONCAT(`event`, ' #', `id`)
WHERE `name` = '';

CREATE TABLE `print_rule_outputs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ruleId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `targetId` INTEGER NOT NULL,
    `templateKey` VARCHAR(191) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `copies` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `print_rule_outputs_ruleId_isActive_priority_idx`(`ruleId`, `isActive`, `priority`),
    INDEX `print_rule_outputs_targetId_idx`(`targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `print_rule_outputs`
    (`ruleId`, `name`, `targetId`, `templateKey`, `priority`, `copies`, `isActive`, `createdAt`, `updatedAt`)
SELECT `id`, CONCAT('Salida ', `id`), `targetId`, `templateKey`, `priority`, 1, `isActive`, `createdAt`, CURRENT_TIMESTAMP(3)
FROM `print_rules`;

UPDATE `print_rules`
SET `targetId` = NULL, `templateKey` = NULL;

ALTER TABLE `print_rules`
    ADD UNIQUE INDEX `print_rules_clinicId_event_name_key`(`clinicId`, `event`, `name`);

ALTER TABLE `print_rule_outputs`
    ADD CONSTRAINT `print_rule_outputs_ruleId_fkey`
    FOREIGN KEY (`ruleId`) REFERENCES `print_rules`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `print_rule_outputs_targetId_fkey`
    FOREIGN KEY (`targetId`) REFERENCES `print_targets`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
