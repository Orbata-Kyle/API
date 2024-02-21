/*
  Warnings:

  - The primary key for the `Cast` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Cast` table. All the data in the column will be lost.
  - The primary key for the `Crew` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Crew` table. All the data in the column will be lost.
  - You are about to drop the `CastPerson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CrewPerson` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `personId` to the `Cast` table without a default value. This is not possible if the table is not empty.
  - Made the column `creditId` on table `Cast` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `personId` to the `Crew` table without a default value. This is not possible if the table is not empty.
  - Made the column `creditId` on table `Crew` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `CastPerson` DROP FOREIGN KEY `CastPerson_creditId_fkey`;

-- DropForeignKey
ALTER TABLE `CastPerson` DROP FOREIGN KEY `CastPerson_personId_fkey`;

-- DropForeignKey
ALTER TABLE `CrewPerson` DROP FOREIGN KEY `CrewPerson_creditId_fkey`;

-- DropForeignKey
ALTER TABLE `CrewPerson` DROP FOREIGN KEY `CrewPerson_personId_fkey`;

-- DropIndex
DROP INDEX `Cast_creditId_idx` ON `Cast`;

-- DropIndex
DROP INDEX `Cast_creditId_key` ON `Cast`;

-- DropIndex
DROP INDEX `Crew_creditId_idx` ON `Crew`;

-- DropIndex
DROP INDEX `Crew_creditId_key` ON `Crew`;

-- AlterTable
ALTER TABLE `Cast` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `personId` INTEGER NOT NULL,
    MODIFY `creditId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`creditId`);

-- AlterTable
ALTER TABLE `Crew` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `personId` INTEGER NOT NULL,
    MODIFY `creditId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`creditId`);

-- DropTable
DROP TABLE `CastPerson`;

-- DropTable
DROP TABLE `CrewPerson`;
