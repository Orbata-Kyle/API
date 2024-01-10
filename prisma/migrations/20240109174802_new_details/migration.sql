/*
  Warnings:

  - Added the required column `updatedAt` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Movie` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `Video` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `movieId` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `site` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `type` VARCHAR(191) NULL,
    `official` BOOLEAN NULL,
    `published` DATETIME(3) NULL,
    `iso31661` VARCHAR(191) NULL,
    `iso6391` VARCHAR(191) NULL,

    INDEX `Video_movieId_idx`(`movieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovieKeyword` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `movieId` INTEGER NOT NULL,
    `keywordId` INTEGER NOT NULL,

    INDEX `MovieKeyword_movieId_idx`(`movieId`),
    INDEX `MovieKeyword_keywordId_idx`(`keywordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Keyword` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cast` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NULL,
    `character` VARCHAR(191) NULL,
    `profileUrl` VARCHAR(191) NULL,
    `popularity` DOUBLE NULL,
    `knownForDepartment` VARCHAR(191) NULL,
    `gender` INTEGER NULL,
    `order` INTEGER NULL,
    `adult` BOOLEAN NULL,
    `movieId` INTEGER NOT NULL,

    INDEX `Cast_movieId_idx`(`movieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Crew` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `job` VARCHAR(191) NULL,
    `profileUrl` VARCHAR(191) NULL,
    `adult` BOOLEAN NULL,
    `knownForDepartment` VARCHAR(191) NULL,
    `popularity` DOUBLE NULL,
    `movieId` INTEGER NOT NULL,

    INDEX `Crew_movieId_idx`(`movieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovieDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `movieId` INTEGER NOT NULL,
    `budget` INTEGER NULL,
    `revenue` INTEGER NULL,
    `runtime` INTEGER NULL,
    `status` VARCHAR(191) NULL,
    `tagline` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovieSpokenLanguage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `movieId` INTEGER NOT NULL,
    `spokenLanguageId` INTEGER NOT NULL,

    INDEX `MovieSpokenLanguage_movieId_idx`(`movieId`),
    INDEX `MovieSpokenLanguage_spokenLanguageId_idx`(`spokenLanguageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpokenLanguage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `englishName` VARCHAR(191) NULL,
    `iso6391` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieKeyword` ADD CONSTRAINT `MovieKeyword_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieKeyword` ADD CONSTRAINT `MovieKeyword_keywordId_fkey` FOREIGN KEY (`keywordId`) REFERENCES `Keyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cast` ADD CONSTRAINT `Cast_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Crew` ADD CONSTRAINT `Crew_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieDetails` ADD CONSTRAINT `MovieDetails_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieSpokenLanguage` ADD CONSTRAINT `MovieSpokenLanguage_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieSpokenLanguage` ADD CONSTRAINT `MovieSpokenLanguage_spokenLanguageId_fkey` FOREIGN KEY (`spokenLanguageId`) REFERENCES `SpokenLanguage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
