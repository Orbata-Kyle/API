/*
  Warnings:

  - A unique constraint covering the columns `[creditId]` on the table `Cast` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creditId]` on the table `Crew` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Cast` ADD COLUMN `creditId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Crew` ADD COLUMN `creditId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Person` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `birthday` DATETIME(3) NULL,
    `deathday` DATETIME(3) NULL,
    `biography` VARCHAR(191) NULL,
    `placeOfBirth` VARCHAR(191) NULL,
    `profileUrl` VARCHAR(191) NULL,
    `adult` BOOLEAN NULL,
    `gender` INTEGER NULL,
    `homepage` VARCHAR(191) NULL,
    `knownForDepartment` VARCHAR(191) NULL,
    `popularity` DOUBLE NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CastPerson` (
    `id` INTEGER NOT NULL,
    `creditId` VARCHAR(191) NOT NULL,
    `personId` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrewPerson` (
    `id` INTEGER NOT NULL,
    `creditId` VARCHAR(191) NOT NULL,
    `personId` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Cast_creditId_key` ON `Cast`(`creditId`);

-- CreateIndex
CREATE INDEX `Cast_creditId_idx` ON `Cast`(`creditId`);

-- CreateIndex
CREATE UNIQUE INDEX `Crew_creditId_key` ON `Crew`(`creditId`);

-- CreateIndex
CREATE INDEX `Crew_creditId_idx` ON `Crew`(`creditId`);

-- AddForeignKey
ALTER TABLE `CastPerson` ADD CONSTRAINT `CastPerson_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CastPerson` ADD CONSTRAINT `CastPerson_creditId_fkey` FOREIGN KEY (`creditId`) REFERENCES `Cast`(`creditId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrewPerson` ADD CONSTRAINT `CrewPerson_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrewPerson` ADD CONSTRAINT `CrewPerson_creditId_fkey` FOREIGN KEY (`creditId`) REFERENCES `Crew`(`creditId`) ON DELETE CASCADE ON UPDATE CASCADE;
