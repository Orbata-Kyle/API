/*
  Warnings:

  - You are about to drop the column `movieId1` on the `MovieRecommedation` table. All the data in the column will be lost.
  - You are about to drop the column `movieId2` on the `MovieRecommedation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[movieId,recommendationMovieId]` on the table `MovieRecommedation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `movieId` to the `MovieRecommedation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recommendationMovieId` to the `MovieRecommedation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `MovieRecommedation` DROP FOREIGN KEY `MovieRecommedation_movieId1_fkey`;

-- DropForeignKey
ALTER TABLE `MovieRecommedation` DROP FOREIGN KEY `MovieRecommedation_movieId2_fkey`;

-- DropIndex
DROP INDEX `MovieRecommedation_movieId1_movieId2_key` ON `MovieRecommedation`;

-- AlterTable
ALTER TABLE `MovieRecommedation` DROP COLUMN `movieId1`,
    DROP COLUMN `movieId2`,
    ADD COLUMN `movieId` INTEGER NOT NULL,
    ADD COLUMN `recommendationMovieId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `MovieRecommedation_movieId_idx` ON `MovieRecommedation`(`movieId`);

-- CreateIndex
CREATE UNIQUE INDEX `MovieRecommedation_movieId_recommendationMovieId_key` ON `MovieRecommedation`(`movieId`, `recommendationMovieId`);

-- AddForeignKey
ALTER TABLE `MovieRecommedation` ADD CONSTRAINT `MovieRecommedation_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieRecommedation` ADD CONSTRAINT `MovieRecommedation_recommendationMovieId_fkey` FOREIGN KEY (`recommendationMovieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
