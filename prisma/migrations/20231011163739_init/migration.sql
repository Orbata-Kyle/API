-- CreateTable
CREATE TABLE `Movie` (
    `id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `posterUrl` TEXT NULL,
    `backdropUrl` TEXT NULL,
    `synopsis` TEXT NULL,
    `releaseDate` DATE NULL,

    INDEX `Movie_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMovieRating` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `movieId` INTEGER NOT NULL,
    `likedStatus` VARCHAR(191) NULL,

    INDEX `UserMovieRating_movieId_idx`(`movieId`),
    INDEX `UserMovieRating_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
