/*
  Warnings:

  - You are about to drop the column `rating` on the `UserMovieRating` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserMovieRating" DROP COLUMN "rating",
ADD COLUMN     "likedStatus" TEXT;
