/*
  Warnings:

  - You are about to drop the column `dateAdded` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Sale` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[modelNumber,brandId]` on the table `ProductModel` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `ProductModel` DROP FOREIGN KEY `ProductModel_brandId_fkey`;

-- DropIndex
DROP INDEX `ProductModel_brandId_modelNumber_key` ON `ProductModel`;

-- AlterTable
ALTER TABLE `Brand` ADD COLUMN `createdById` INTEGER NULL;

-- AlterTable
ALTER TABLE `Category` ADD COLUMN `createdById` INTEGER NULL;

-- AlterTable
ALTER TABLE `InventoryItem` DROP COLUMN `dateAdded`,
    ADD COLUMN `borrowingId` INTEGER NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `status` ENUM('IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'BORROWED') NOT NULL DEFAULT 'IN_STOCK';

-- AlterTable
ALTER TABLE `ProductModel` ALTER COLUMN `sellingPrice` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Sale` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    ALTER COLUMN `subtotal` DROP DEFAULT,
    ALTER COLUMN `vatAmount` DROP DEFAULT,
    ALTER COLUMN `total` DROP DEFAULT;

-- AlterTable
ALTER TABLE `User` MODIFY `name` VARCHAR(191) NOT NULL,
    MODIFY `role` ENUM('EMPLOYEE', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'EMPLOYEE';

-- CreateTable
CREATE TABLE `Borrowing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `borrowerId` INTEGER NOT NULL,
    `approvedById` INTEGER NOT NULL,
    `borrowDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `returnDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `status` ENUM('BORROWED', 'RETURNED', 'OVERDUE') NOT NULL DEFAULT 'BORROWED',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `InventoryItem_status_idx` ON `InventoryItem`(`status`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductModel_modelNumber_brandId_key` ON `ProductModel`(`modelNumber`, `brandId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Brand` ADD CONSTRAINT `Brand_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductModel` ADD CONSTRAINT `ProductModel_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_borrowingId_fkey` FOREIGN KEY (`borrowingId`) REFERENCES `Borrowing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Borrowing` ADD CONSTRAINT `Borrowing_borrowerId_fkey` FOREIGN KEY (`borrowerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Borrowing` ADD CONSTRAINT `Borrowing_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
