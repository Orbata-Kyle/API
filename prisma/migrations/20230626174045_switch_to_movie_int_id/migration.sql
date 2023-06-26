/*
  Warnings:

  - The primary key for the `Movie` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `Movie` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `movieId` on the `UserMovieRating` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "UserMovieRating" DROP CONSTRAINT "UserMovieRating_movieId_fkey";

-- AlterTable
ALTER TABLE "Movie" DROP CONSTRAINT "Movie_pkey",
ADD COLUMN     "releaseDate" DATE,
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD CONSTRAINT "Movie_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UserMovieRating" DROP COLUMN "movieId",
ADD COLUMN     "movieId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "UserMovieRating" ADD CONSTRAINT "UserMovieRating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
