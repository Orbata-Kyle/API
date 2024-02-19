-- AlterTable
ALTER TABLE `MovieDetails` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `TournamentRating` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `UserMovieRating` ALTER COLUMN `updatedAt` DROP DEFAULT;
