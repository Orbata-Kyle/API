/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `InvalidUserSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `InvalidUserSession_userId_key` ON `InvalidUserSession`(`userId`);
