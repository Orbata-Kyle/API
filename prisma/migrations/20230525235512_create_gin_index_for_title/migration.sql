-- CreateIndex
CREATE INDEX "title_trgm_idx" ON "Movie" USING GIN ("title" gin_trgm_ops);
