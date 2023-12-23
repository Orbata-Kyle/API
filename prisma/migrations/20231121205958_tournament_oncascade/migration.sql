-- DropForeignKey
ALTER TABLE `TournamentRating` DROP FOREIGN KEY `TournamentRating_movie1Id_fkey`;

-- DropForeignKey
ALTER TABLE `TournamentRating` DROP FOREIGN KEY `TournamentRating_movie2Id_fkey`;

-- DropForeignKey
ALTER TABLE `TournamentRating` DROP FOREIGN KEY `TournamentRating_userId_fkey`;

-- AddForeignKey
ALTER TABLE `TournamentRating` ADD CONSTRAINT `TournamentRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentRating` ADD CONSTRAINT `TournamentRating_movie1Id_fkey` FOREIGN KEY (`movie1Id`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentRating` ADD CONSTRAINT `TournamentRating_movie2Id_fkey` FOREIGN KEY (`movie2Id`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
