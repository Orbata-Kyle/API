/*
  Warnings:

  - You are about to drop the column `synopsis` on the `Movie` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[movieId]` on the table `MovieDetails` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Movie` DROP COLUMN `synopsis`,
    ADD COLUMN `synopsi` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `MovieDetails_movieId_key` ON `MovieDetails`(`movieId`);
