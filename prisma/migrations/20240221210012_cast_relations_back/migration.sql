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

-- AddForeignKey
ALTER TABLE `CastPerson` ADD CONSTRAINT `CastPerson_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CastPerson` ADD CONSTRAINT `CastPerson_creditId_fkey` FOREIGN KEY (`creditId`) REFERENCES `Cast`(`creditId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrewPerson` ADD CONSTRAINT `CrewPerson_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrewPerson` ADD CONSTRAINT `CrewPerson_creditId_fkey` FOREIGN KEY (`creditId`) REFERENCES `Crew`(`creditId`) ON DELETE CASCADE ON UPDATE CASCADE;
