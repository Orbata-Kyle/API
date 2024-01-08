/*
  Warnings:

  - You are about to drop the column `movieId` on the `Genre` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Genre` DROP FOREIGN KEY `Genre_movieId_fkey`;

-- AlterTable
ALTER TABLE `Genre` DROP COLUMN `movieId`;

-- CreateTable
CREATE TABLE `MovieGenre` (
    `movieId` INTEGER NOT NULL,
    `genreId` INTEGER NOT NULL,

    INDEX `MovieGenre_genreId_idx`(`genreId`),
    INDEX `MovieGenre_movieId_idx`(`movieId`),
    PRIMARY KEY (`movieId`, `genreId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MovieGenre` ADD CONSTRAINT `MovieGenre_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieGenre` ADD CONSTRAINT `MovieGenre_genreId_fkey` FOREIGN KEY (`genreId`) REFERENCES `Genre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
