/*
  Warnings:

  - You are about to drop the column `assignedToId` on the `InventoryItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `InventoryItem` DROP FOREIGN KEY `InventoryItem_assignedToId_fkey`;

-- DropIndex
DROP INDEX `InventoryItem_assignedToId_fkey` ON `InventoryItem`;

-- AlterTable
ALTER TABLE `InventoryItem` DROP COLUMN `assignedToId`;

-- CreateTable
CREATE TABLE `AssetAssignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assigneeId` INTEGER NOT NULL,
    `approvedById` INTEGER NOT NULL,
    `assignedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `status` ENUM('ASSIGNED', 'PARTIALLY_RETURNED', 'RETURNED') NOT NULL DEFAULT 'ASSIGNED',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetAssignmentOnItems` (
    `assignmentId` INTEGER NOT NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,

    PRIMARY KEY (`assignmentId`, `inventoryItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AssetAssignment` ADD CONSTRAINT `AssetAssignment_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAssignment` ADD CONSTRAINT `AssetAssignment_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAssignmentOnItems` ADD CONSTRAINT `AssetAssignmentOnItems_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `AssetAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetAssignmentOnItems` ADD CONSTRAINT `AssetAssignmentOnItems_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
