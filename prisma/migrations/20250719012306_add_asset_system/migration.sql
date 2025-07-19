/*
  Warnings:

  - A unique constraint covering the columns `[assetCode]` on the table `InventoryItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `assetCode` VARCHAR(191) NULL,
    ADD COLUMN `assignedToId` INTEGER NULL,
    ADD COLUMN `itemType` ENUM('SALE', 'ASSET') NOT NULL DEFAULT 'SALE',
    MODIFY `status` ENUM('IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'BORROWED', 'IN_WAREHOUSE', 'ASSIGNED', 'DECOMMISSIONED') NOT NULL DEFAULT 'IN_STOCK';

-- CreateIndex
CREATE UNIQUE INDEX `InventoryItem_assetCode_key` ON `InventoryItem`(`assetCode`);

-- CreateIndex
CREATE INDEX `InventoryItem_itemType_idx` ON `InventoryItem`(`itemType`);

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
