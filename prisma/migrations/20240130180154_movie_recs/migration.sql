-- CreateTable
CREATE TABLE `MovieRecommedation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `movieId1` INTEGER NOT NULL,
    `movieId2` INTEGER NOT NULL,

    INDEX `MovieRecommedation_movieId1_idx`(`movieId1`),
    INDEX `MovieRecommedation_movieId2_idx`(`movieId2`),
    UNIQUE INDEX `MovieRecommedation_movieId1_movieId2_key`(`movieId1`, `movieId2`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MovieRecommedation` ADD CONSTRAINT `MovieRecommedation_movieId1_fkey` FOREIGN KEY (`movieId1`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovieRecommedation` ADD CONSTRAINT `MovieRecommedation_movieId2_fkey` FOREIGN KEY (`movieId2`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
