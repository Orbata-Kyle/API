import { PrismaClient, Movie } from '@prisma/client';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import { userData } from '../data/user-data';

const prisma = new PrismaClient();

async function main() {
  await seedMovies();
  await seedUsers();
}

async function seedUsers() {
  console.log('👥 Seeding users...');

  for (const user of userData) {
    const newUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.name.toLowerCase().replace(/\s/g, '.') + '@example.com',
      },
    });

    let rank = 0;
    for (const title of user.movies) {
      const movie = await findMatchingMovieByTitle(title);
      if (movie) {
        const rating = await prisma.userMovieRating.create({
          data: {
            movieId: movie.id,
            userId: newUser.id,
            rating: rank,
          },
        });
        rank++;
        console.log('Created rating for the movie ' + movie.title);
      }
    }
  }
}

/**
 * Find a movie in the DB that matches the supplied title
 *
 * @remarks
 * This will first attempt to do an exact match. If that doesn't work, it will do a
 * fuzzy search based on the supplied title. This might not get the exact right movie
 */
async function findMatchingMovieByTitle(title: string) {
  // Attempt to find a movie by the title directly.
  const movie = await prisma.movie.findFirst({
    where: { title: title.toLowerCase().trim() },
  });

  if (movie) {
    return movie;
  }

  // Otherwise, look for movies that are similar to the title requested
  const similarMovies = await prisma.$queryRaw<
    Movie[]
  >`SELECT * FROM "Movie" where SIMILARITY(title, ${title}) > 0.5`;

  const firstMatch = similarMovies[0];

  if (firstMatch) {
    console.log(`  Matching ${bold(title)} to "${bold(firstMatch.title)}"`);
    return firstMatch;
  }

  // If we don't find a similar movie, log it and return nothing
  console.warn(`  Warning: Unable to find a movie matching "${bold(title)}"`);
  return null;
}

/**
 * Seed the movies table from the DB export
 */
async function seedMovies() {
  console.log('🎬 Seeding movies...');

  const parser = parse({
    delimiter: '\t',
    columns: true,
    ltrim: true,
    escape: ' ',
    skip_records_with_error: true,
    skip_empty_lines: true,
  });

  const dataFileName = path.resolve(
    __dirname,
    '../data/filtered-movie-data.tsv',
  );

  const readStream = fs.createReadStream(dataFileName);

  readStream.pipe(parser);

  let moviesToCreate = [];

  for await (const movie of parser) {
    if (movie.titleType === 'movie') {
      try {
        moviesToCreate.push({
          title: movie.primaryTitle.toLowerCase().trim(),
        });

        if (moviesToCreate.length >= 10000) {
          console.log(`  Saving batch of ${moviesToCreate.length} movies.`);
          await prisma.movie.createMany({ data: [...moviesToCreate] });
          moviesToCreate = [];
        }
      } catch (error) {
        console.error('Error saving movie');
        console.error(error);
      }
    }
  }

  if (moviesToCreate.length > 0) {
    console.log(`  Saving final batch of ${moviesToCreate.length} movies.`);
    await prisma.movie.createMany({ data: [...moviesToCreate] });
  }
}

main()
  .then(() => {
    console.log('Finished seeding data');
  })
  .catch((error) => {
    console.log('Error when seeding data');
    console.error(error);
  });

/**
 * Formats a text with escape codes to bold it
 */
function bold(text: string) {
  const reset = '\x1b[0m';
  const bright = '\x1b[1m';

  return `${bright}${text}${reset}`;
}
