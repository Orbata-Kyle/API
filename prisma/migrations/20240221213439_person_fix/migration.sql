/*
  Warnings:

  - A unique constraint covering the columns `[creditId,personId]` on the table `CastPerson` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creditId,personId]` on the table `CrewPerson` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `CastPerson_creditId_personId_key` ON `CastPerson`(`creditId`, `personId`);

-- CreateIndex
CREATE UNIQUE INDEX `CrewPerson_creditId_personId_key` ON `CrewPerson`(`creditId`, `personId`);
