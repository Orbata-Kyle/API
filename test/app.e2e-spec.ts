import { after, describe } from 'node:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '../src/utils/logging/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from '../src/modules/auth/dto';
import { AuthService } from '../src/modules/auth/auth.service';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let adminAt: string;
  let auth: AuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // remove unknown properties from DTOs
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);
    auth = app.get(AuthService);
    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:3333');

    // Create admin account
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        hash: 'test',
        admin: true,
      },
    });

    adminAt = (await auth.signToken(adminUser.id, adminUser.email))
      .access_token;
  });

  afterAll(async () => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@test.com',
      password: 'test',
    };

    describe('Signup', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });
      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });
      it('should throw if no body provided', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400);
      });
      it('should signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
      it('should throw if email taken', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(403);
      });
    });

    describe('Signin', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });
      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });
      it('Should throw if no body provided', () => {
        return pactum.spec().post('/auth/signin').expectStatus(400);
      });
      it('should signin', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token');
      });
    });
  });

  describe('Auth Wrong JWT', () => {
    it('Should throw if jwt wrong', () => {
      return pactum
        .spec()
        .get('/user')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}err',
        })
        .expectStatus(401);
    });
  });

  describe('retireveOwnUser', () => {
    it('Should retireveOwnUser', async () => {
      await pactum
        .spec()
        .get('/user')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .expectStatus(200)
        .stores('userId', 'id');

      userId = pactum.stash.getDataStore()['userId'];
      expect(userId).toBeDefined();
    });
  });

  describe('Movie', () => {
    describe('searchForMovieByTitle', () => {
      it('Should search for a movie by title', async () => {
        await pactum
          .spec()
          .get('/movie/search')
          .withQueryParams('title', 'Inception')
          .expectStatus(200)
          .expectBodyContains('Inception');

        await assertMovieExistsInDb();
      });
      it('Should search for a movie by empty title', () => {
        return pactum
          .spec()
          .get('/movie/search')
          .withQueryParams('title', '')
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('getMovieById', () => {
      it('Should get a movie by ID', async () => {
        await pactum
          .spec()
          .get('/movie/{id}')
          .withPathParams('id', '100')
          .expectStatus(200)
          .expectJsonLike({
            id: 100,
          });

        await assertMovieExistsInDb(100);
      });
    });

    describe('rateMovieById', () => {
      it('Should throw if unsupported action', async () => {
        await pactum
          .spec()
          .post('/movie/{id}/rate/{action}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withPathParams('id', '100')
          .withPathParams('action', 'meh')
          .expectStatus(400);
      });

      it('Should rateMovieById with disliked', async () => {
        await pactum
          .spec()
          .post('/movie/{id}/rate/{action}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withPathParams('id', '100')
          .withPathParams('action', 'disliked')
          .expectStatus(201);

        await assertUserMovieRatingExistsInDb(100, 'disliked');
      });

      it('Rate with "Unseen" and change previous rating to liked', async () => {
        await pactum
          .spec()
          .post('/movie/{id}/rate/{action}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withPathParams('id', '100')
          .withPathParams('action', 'liked')
          .expectStatus(201);

        await assertUserMovieRatingExistsInDb(100, 'liked');
      });

      it('Should rateMovieById with liked but get from API frist', async () => {
        await pactum
          .spec()
          .post('/movie/{id}/rate/{action}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withPathParams('id', '101')
          .withPathParams('action', 'liked')
          .expectStatus(201);

        await assertUserMovieRatingExistsInDb(101, 'liked');
      });

      it('Rate with "Unseen" and change previous rating', async () => {
        await pactum
          .spec()
          .post('/movie/{id}/rate/{action}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withPathParams('id', '101')
          .withPathParams('action', 'unseen')
          .expectStatus(201);

        await assertUserMovieRatingExistsInDb(101, 'unseen');
      });
    });
  });

  describe('User', () => {
    describe('retrieveOwnRatings', () => {
      it('Should retrieveOwnRatings', async () => {
        await pactum
          .spec()
          .get('/user/ratings')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike([
            {
              movie: {
                id: 100,
              },
              likedStatus: 'liked',
            },
            {
              movie: {
                id: 101,
              },
              likedStatus: 'unseen',
            },
          ]);
      });
    });

    describe('Retrieve other users', () => {
      it('Should throw if not admin', async () => {
        await pactum
          .spec()
          .get('/user/{id}')
          .withPathParams('id', '$S{userId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(401);
      });

      it('Should return user if admin access token', async () => {
        await pactum
          .spec()
          .get('/user/{id}')
          .withPathParams('id', '$S{userId}')
          .withHeaders({
            Authorization: `Bearer ${adminAt}`,
          })
          .expectStatus(200)
          .expectJsonLike({
            UserMovieRating: [
              {
                movie: {
                  id: 100,
                },
                likedStatus: 'liked',
              },
              {
                movie: {
                  id: 101,
                },
                likedStatus: 'unseen',
              },
            ],
          });
      });
    });
  });

  describe('Swipe', () => {
    describe('getNextMovieToSwipe', async () => {
      it('Should getNextMovieToSwipe', () => {
        return pactum
          .spec()
          .get('/swipe/next')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectBodyContains('id')
          .expectBodyContains('title')
          .stores('movieId', 'id');
      });

      it('Rate previous movie then should get different NextMovieToSwipe', async () => {
        await pactum.sleep(200);
        // Rate this movie
        await pactum
          .spec()
          .post('/movie/{id}/rate/{action}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withPathParams('id', '$S{movieId}')
          .withPathParams('action', 'liked');

        const prevMovieId = pactum.stash.getDataStore()['movieId'];
        expect(prevMovieId).toBeDefined();

        return pactum
          .spec()
          .get('/swipe/next')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectBodyContains('id')
          .expectBodyContains('title')
          .expect((res) => {
            if (JSON.stringify(res.res.body).includes(prevMovieId)) {
              throw new Error(
                'Got the same movie as before, even though it was rated',
              );
            }
          });
      });
    });
  });

  async function assertMovieExistsInDb(
    id?: number,
    maxAttempts = 3,
    delay = 200,
  ) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const movies = await prisma.movie.findMany(
        id ? { where: { id: id } } : null,
      );
      if (id && movies.length > 0) {
        return; // Movie with specific id found, exit the function
      } else if (!id && movies.length > 0) {
        return; // Movies found in general, exit the function
      }

      // Wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    // If the loop completes without returning, throw an error
    throw new Error(
      `Movie with ${
        id ? 'id ' + id : 'any id'
      } not found in database after ${maxAttempts} attempts.`,
    );
  }

  async function assertUserMovieRatingExistsInDb(
    movieId: number,
    expectedLikedStatus: string,
    userIdTemp = userId,
    maxAttempts = 3,
    delay = 200,
  ) {
    let attempts = 0;
    const query = { where: { userId: userIdTemp, movieId } };

    while (attempts < maxAttempts) {
      const ratings = await prisma.userMovieRating.findMany(query);
      if (ratings.length > 1) {
        throw new Error(
          `Multiple ratings found for user ${userIdTemp} and movie ${movieId}`,
        );
      }
      if (
        ratings.length > 0 &&
        ratings[0].likedStatus === expectedLikedStatus
      ) {
        return; // Rating with specified likedStatus and movieId for userIdTemp found, exit the function
      } else if (
        ratings.length > 0 &&
        ratings[0].likedStatus !== expectedLikedStatus
      ) {
        throw new Error(
          `Rating with movieId ${movieId} for user ${userIdTemp} found in database but with wrong likedStatus.`,
        );
      }

      // Wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    // If the loop completes without returning, throw an error
    throw new Error(
      `Rating for movieId ${movieId} and user ${userIdTemp} not found in database after ${maxAttempts} attempts.`,
    );
  }
});
