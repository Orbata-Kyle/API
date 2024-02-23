import { Injectable, NotFoundException } from '@nestjs/common';
import { PersonCreateInputAndRelations, TheMovieDb } from '../../services/the-movie-db.service';
import { PrismaService } from '../prisma/prisma.service';
import logger from '../../utils/logging/winston-config';
import { Person } from '@prisma/client';

@Injectable()
export class PeopleCacheService {
  constructor(private readonly prisma: PrismaService, private readonly theMovieDb: TheMovieDb) {}

  async getPersonById(id: number, includeRelations = true): Promise<any> {
    const personFromDb = await this.getPersonFromDb(id, includeRelations);

    if (personFromDb) {
      // Determine if we need to update the person in DB
      const needsUpdate = includeRelations && !(personFromDb.CastPeople.length > 0) && !(personFromDb.CrewPeople.length > 0);
      if (!needsUpdate) {
        logger.info(`Person ${id} found in DB`);
        if (includeRelations) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { CastPeople, CrewPeople, ...personWithoutCastCrew } = personFromDb;
          // Restructure for less nested and better spelled response
          return {
            ...personWithoutCastCrew,
            CastMovies: personFromDb.CastPeople.map((castPerson) => castPerson.cast),
            CrewMovies: personFromDb.CrewPeople.map((crewPerson) => crewPerson.crew),
          };
        } else {
          return personFromDb;
        }
      }
    }

    let personToSave: PersonCreateInputAndRelations;
    try {
      personToSave = await this.theMovieDb.getPersonById(id);
    } catch (error) {
      if (error.response.status === 404) {
        throw new NotFoundException('Person not found');
      }
    }
    const person = await this.savePersonToDb(personToSave, includeRelations);

    if (includeRelations) {
      // Get person with relations from DB as the saved object does not include relations
      const personWithRelations = await this.getPersonFromDb(person.id, true);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { CastPeople, CrewPeople, ...personWithoutCastCrew } = personWithRelations;
      // Restructure for less nested and better spelled response
      return {
        ...personWithoutCastCrew,
        CastMovies: personWithRelations.CastPeople.map((castPerson) => castPerson.cast),
        CrewMovies: personWithRelations.CrewPeople.map((crewPerson) => crewPerson.crew),
      };
    }

    return person;
  }

  private async savePersonToDb(person: PersonCreateInputAndRelations, saveRelations = true): Promise<Person> {
    const savedPerson = await this.prisma.person.upsert({
      where: {
        id: person.personCreateInput.id,
      },
      create: person.personCreateInput,
      update: person.personCreateInput,
    });
    logger.info(`Saved person ${person.personCreateInput.id} to database`);

    if (saveRelations) {
      let savedCastCount = 0;
      for (const castMovie of person.castMovieCreateInputs) {
        // Ensure movie is in DB
        // First find and then create and not upsert as expected default is that it already exists
        const movie = await this.prisma.movie.findUnique({
          where: {
            id: castMovie.cast.movieId,
          },
        });
        if (!movie) {
          await this.prisma.movie.create({
            data: castMovie.movie,
          });
        }

        // Upsert as no expectation of existence but also no expectation it doesn't, middle ground of create and update cache
        await this.prisma.cast.upsert({
          where: {
            creditId: castMovie.cast.creditId,
          },
          create: castMovie.cast,
          update: castMovie.cast,
        });
        savedCastCount++;

        // Upsert as no expectation of existence but also no expectation it doesn't, middle ground of create and update cache
        await this.prisma.castPerson.upsert({
          where: {
            creditId_personId: {
              creditId: castMovie.cast.creditId,
              personId: savedPerson.id,
            },
          },
          update: {},
          create: {
            creditId: castMovie.cast.creditId,
            personId: savedPerson.id,
          },
        });
      }
      logger.info(`Saved/Updated ${savedCastCount} casts to DB`);

      let savedCrewCount = 0;
      for (const crewMovie of person.crewMovieCreateInputs) {
        // Ensure movie is in DB
        // First find and then create and not upsert as expected default is that it already exists
        const movie = await this.prisma.movie.findUnique({
          where: {
            id: crewMovie.crew.movieId,
          },
        });
        if (!movie) {
          await this.prisma.movie.create({
            data: crewMovie.movie,
          });
        }

        // Upsert as no expectation of existence but also no expectation it doesn't, middle ground of create and update cache
        await this.prisma.crew.upsert({
          where: {
            creditId: crewMovie.crew.creditId,
          },
          create: crewMovie.crew,
          update: crewMovie.crew,
        });
        savedCrewCount++;

        // Upsert as no expectation of existence but also no expectation it doesn't, middle ground of create and update cache
        await this.prisma.crewPerson.upsert({
          where: {
            creditId_personId: {
              creditId: crewMovie.crew.creditId,
              personId: savedPerson.id,
            },
          },
          update: {},
          create: {
            creditId: crewMovie.crew.creditId,
            personId: savedPerson.id,
          },
        });
      }
      logger.info(`Saved/Updated ${savedCrewCount} crews to DB`);
    }

    return savedPerson;
  }

  private async getPersonFromDb(id: number, includeRelations = true) {
    return await this.prisma.person.findUnique({
      where: {
        id,
      },
      include: includeRelations
        ? {
            CastPeople: {
              include: {
                cast: {
                  include: {
                    movie: true,
                  },
                },
              },
            },
            CrewPeople: {
              include: {
                crew: {
                  include: {
                    movie: true,
                  },
                },
              },
            },
          }
        : undefined,
    });
  }
}
