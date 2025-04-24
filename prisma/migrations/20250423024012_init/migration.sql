/*
  Warnings:

  - You are about to alter the column `category` on the `Service` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.
  - You are about to drop the `ServiceImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ServiceImage` DROP FOREIGN KEY `ServiceImage_serviceId_fkey`;

-- AlterTable
ALTER TABLE `Service` ADD COLUMN `image` VARCHAR(191) NULL,
    MODIFY `category` ENUM('EDUCATION', 'SANTE', 'INFRASTRUCTURES') NOT NULL;

-- DropTable
DROP TABLE `ServiceImage`;
