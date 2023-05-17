-- CreateTable
CREATE TABLE "Movie" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "synopsis" TEXT,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);
