-- AddForeignKey
ALTER TABLE `UserMovieRating` ADD CONSTRAINT `UserMovieRating_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMovieRating` ADD CONSTRAINT `UserMovieRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentRating` ADD CONSTRAINT `TournamentRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentRating` ADD CONSTRAINT `TournamentRating_movie1Id_fkey` FOREIGN KEY (`movie1Id`) REFERENCES `Movie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentRating` ADD CONSTRAINT `TournamentRating_movie2Id_fkey` FOREIGN KEY (`movie2Id`) REFERENCES `Movie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
