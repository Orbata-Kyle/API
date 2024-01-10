/*
  Warnings:

  - You are about to drop the column `synopsi` on the `Movie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Movie` DROP COLUMN `synopsi`,
    ADD COLUMN `synopsis` TEXT NULL;
