/*
  Warnings:

  - A unique constraint covering the columns `[movieId,genreId]` on the table `MovieGenre` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[movieId,keywordId]` on the table `MovieKeyword` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[movieId,spokenLanguageIso]` on the table `MovieSpokenLanguage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,movieId]` on the table `UserMovieRating` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `MovieGenre_movieId_genreId_key` ON `MovieGenre`(`movieId`, `genreId`);

-- CreateIndex
CREATE UNIQUE INDEX `MovieKeyword_movieId_keywordId_key` ON `MovieKeyword`(`movieId`, `keywordId`);

-- CreateIndex
CREATE UNIQUE INDEX `MovieSpokenLanguage_movieId_spokenLanguageIso_key` ON `MovieSpokenLanguage`(`movieId`, `spokenLanguageIso`);

-- CreateIndex
CREATE UNIQUE INDEX `UserMovieRating_userId_movieId_key` ON `UserMovieRating`(`userId`, `movieId`);
