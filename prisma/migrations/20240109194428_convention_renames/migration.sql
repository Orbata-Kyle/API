/*
  Warnings:

  - You are about to drop the column `spokenLanguageId` on the `MovieSpokenLanguage` table. All the data in the column will be lost.
  - You are about to drop the `SpokenLanguage` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `spokenLanguageIso` to the `MovieSpokenLanguage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `MovieSpokenLanguage` DROP FOREIGN KEY `MovieSpokenLanguage_spokenLanguageId_fkey`;

-- AlterTable
ALTER TABLE `MovieSpokenLanguage` DROP COLUMN `spokenLanguageId`,
    ADD COLUMN `spokenLanguageIso` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `SpokenLanguage`;

-- CreateTable
CREATE TABLE `Language` (
    `iso6391` VARCHAR(191) NOT NULL,
    `englishName` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,

    PRIMARY KEY (`iso6391`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `MovieSpokenLanguage_spokenLanguageIso_idx` ON `MovieSpokenLanguage`(`spokenLanguageIso`);

-- AddForeignKey
ALTER TABLE `MovieSpokenLanguage` ADD CONSTRAINT `MovieSpokenLanguage_spokenLanguageIso_fkey` FOREIGN KEY (`spokenLanguageIso`) REFERENCES `Language`(`iso6391`) ON DELETE CASCADE ON UPDATE CASCADE;
