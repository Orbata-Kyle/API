/*
  Warnings:

  - A unique constraint covering the columns `[userId,movie1Id,movie2Id]` on the table `TournamentRating` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `TournamentRating_userId_movie1Id_movie2Id_key` ON `TournamentRating`(`userId`, `movie1Id`, `movie2Id`);
