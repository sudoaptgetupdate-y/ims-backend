/*
  Warnings:

  - You are about to drop the column `borrowingId` on the `InventoryItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `InventoryItem` DROP FOREIGN KEY `InventoryItem_borrowingId_fkey`;

-- DropIndex
DROP INDEX `InventoryItem_borrowingId_fkey` ON `InventoryItem`;

-- AlterTable
ALTER TABLE `InventoryItem` DROP COLUMN `borrowingId`;

-- CreateTable
CREATE TABLE `BorrowingOnItems` (
    `borrowingId` INTEGER NOT NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,

    PRIMARY KEY (`borrowingId`, `inventoryItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BorrowingOnItems` ADD CONSTRAINT `BorrowingOnItems_borrowingId_fkey` FOREIGN KEY (`borrowingId`) REFERENCES `Borrowing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BorrowingOnItems` ADD CONSTRAINT `BorrowingOnItems_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
