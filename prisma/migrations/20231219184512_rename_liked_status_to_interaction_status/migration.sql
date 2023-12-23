/*
  Warnings:

  - You are about to drop the column `likedStatus` on the `TournamentRating` table. All the data in the column will be lost.
  - You are about to drop the column `likedStatus` on the `UserMovieRating` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TournamentRating` DROP COLUMN `likedStatus`,
    ADD COLUMN `interactionStatus` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `UserMovieRating` DROP COLUMN `likedStatus`,
    ADD COLUMN `interactionStatus` VARCHAR(191) NULL;
