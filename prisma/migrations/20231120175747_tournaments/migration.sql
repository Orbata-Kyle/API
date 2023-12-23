-- CreateTable
CREATE TABLE `TournamentRating` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `movie1Id` INTEGER NOT NULL,
    `movie2Id` INTEGER NOT NULL,
    `winnerId` INTEGER NOT NULL,

    INDEX `TournamentRating_userId_idx`(`userId`),
    INDEX `TournamentRating_movie2Id_idx`(`movie2Id`),
    INDEX `TournamentRating_movie1Id_idx`(`movie1Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
