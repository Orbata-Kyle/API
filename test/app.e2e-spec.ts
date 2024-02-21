import { describe } from 'node:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '../src/utils/logging/all-exceptions.filter';
import { PrismaService } from '../src/utility-modules/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from '../src/api-modules/auth/dto/request';
import { AuthService } from '../src/api-modules/auth/auth.service';
import { MatchupDto } from 'src/api-modules/tournament/dto/response';

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
        firstName: 'testFirst',
        lastName: 'testLast',
      },
    });

    adminAt = (await auth.signToken(adminUser.id, adminUser.email)).access_token;
  });

  afterAll(async () => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@test.com',
      password: 'test',
      firstName: 'testFirst',
      lastName: 'testLast',
    };

    describe('Signup', () => {
      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            email: undefined,
          })
          .expectStatus(400);
      });
      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            password: undefined,
          })
          .expectStatus(400);
      });
      it('should throw if first name empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            firstName: undefined,
          })
          .expectStatus(400);
      });
      it('should throw if last name empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            ...dto,
            lastName: undefined,
          })
          .expectStatus(400);
      });
      it('should throw if no body provided', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400);
      });

      it('should signup', () => {
        return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(201).expectJsonLike({
          firstName: 'testFirst',
          lastName: 'testLast',
          email: 'test@test.com',
        });
      });
      it('should throw if email taken', () => {
        return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(403);
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
        return pactum.spec().post('/auth/signin').withBody(dto).expectStatus(200).stores('userAt', 'access_token');
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
        await pactum.spec().get('/movie/search').withQueryParams('title', 'Inception').expectStatus(200).expectBodyContains('Inception');

        await assertMovieExistsInDb();
      });
      it('Should search for a movie by empty title', () => {
        return pactum.spec().get('/movie/search').withQueryParams('title', '').expectStatus(200).expectBody({ movies: [], page: 1 });
      });
      it('Should search for a movie by title with page', () => {
        return pactum
          .spec()
          .get('/movie/search')
          .withQueryParams('title', 'Inception')
          .withQueryParams('page', '2')
          .expectStatus(200)
          .expectJsonLike({ page: 2 });
      });
    });

    describe('getMovieById', () => {
      it('Should get a movie by ID with all details', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/movie/{id}')
          .withPathParams('id', '100')
          .expectStatus(200)
          .expectJsonLike({
            id: 100,
          })
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        await assertMovieExistsInDb(100);

        if (!responseBody.genres.length || responseBody.genres.lenngth === 0) {
          throw new Error('Movie genres not found');
        }
        if (!responseBody.spokenLanguages.length || responseBody.spokenLanguages.lenngth === 0) {
          throw new Error('Movie spokenLanguages not found');
        }
        if (!responseBody.keywords.length || responseBody.keywords.lenngth === 0) {
          throw new Error('Movie keywords not found');
        }
        if (!responseBody.cast.length || responseBody.cast.lenngth === 0) {
          throw new Error('Movie cast not found');
        }
        if (!responseBody.crew.length || responseBody.crew.lenngth === 0) {
          throw new Error('Movie crew not found');
        }
        if (!responseBody.videos) {
          throw new Error('Movie videos not found');
        }
        if (!responseBody.details) {
          throw new Error('Movie details not found');
        }
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
        await rateMovie('100', 'disliked');

        await assertUserMovieRatingExistsInDb(100, 'disliked');
      });

      it('Rate with "Unseen" and change previous rating to liked', async () => {
        await rateMovie('100', 'liked');

        await assertUserMovieRatingExistsInDb(100, 'liked');
      });

      it('Should rateMovieById with liked but get from API frist', async () => {
        await rateMovie('101', 'liked');
        await rateMovie('102', 'liked');

        await assertUserMovieRatingExistsInDb(101, 'liked');
        await assertUserMovieRatingExistsInDb(102, 'liked');
      });

      it('Rate with "Unseen" and change previous rating', async () => {
        await rateMovie('101', 'unseen');

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
              interactionStatus: 'liked',
            },
            {
              movie: {
                id: 101,
              },
              interactionStatus: 'unseen',
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

      it("Should thow if user doesn't exists", async () => {
        await pactum
          .spec()
          .get('/user/{id}')
          .withPathParams('id', '0')
          .withHeaders({
            Authorization: `Bearer ${adminAt}`,
          })
          .expectStatus(404);
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
                interactionStatus: 'liked',
              },
              {
                movie: {
                  id: 101,
                },
                interactionStatus: 'unseen',
              },
            ],
          });
      });
    });

    describe('Change profile', () => {
      it('Should throw if not logged in', () => {
        return pactum
          .spec()
          .put('/user/changeProfile')
          .withBody({
            firstName: 'testFirst',
            lastName: 'testLast',
          })
          .expectStatus(401);
      });

      it('Should throw if no body provided', () => {
        return pactum
          .spec()
          .put('/user/changeProfile')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(400);
      });

      it('Should change name', () => {
        return pactum
          .spec()
          .put('/user/changeProfile')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            firstName: 'testFirstNew',
            lastName: 'testLastNew',
          })
          .expectStatus(200)
          .expectJsonLike({
            firstName: 'testFirstNew',
            lastName: 'testLastNew',
          });
      });

      it('Should change email', () => {
        return pactum
          .spec()
          .put('/user/changeProfile')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            email: 'newMail@test.de',
          })
          .expectStatus(200)
          .expectJsonLike({
            email: 'newMail@test.de',
          });
      });

      it('Should add optional info', async () => {
        await pactum
          .spec()
          .put('/user/changeProfile')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            birthDate: '2023-01-01T00:00:00.000Z',
            phoneNumber: '+4915777765590',
            gender: 'Man',
            country: 'US',
          })
          .expectStatus(200);

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

        expect(user.birthDate).toBeDefined();
        expect(user.phoneNumber).toBeDefined();
        expect(user.gender).toBeDefined();
        expect(user.country).toBeDefined();
      });

      it('Should throw if invalid phone', () => {
        return pactum
          .spec()
          .put('/user/changeProfile')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            phoneNumber: '+1234567890',
          })
          .expectStatus(400);
      });

      it('Should throw if invalid birthDate', () => {
        return pactum
          .spec()
          .put('/user/changeProfile')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            birthDate: 'asd',
          })
          .expectStatus(400);
      });

      it('Should change password and invalidate previous sessions', async () => {
        const previousAccessToken = pactum.stash.getDataStore()['userAt'];

        await pactum
          .spec()
          .put('/user/changeProfile')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            password: 'newPassword',
          })
          .expectStatus(200)
          .expectBodyContains('access_token')
          .stores('userAt', 'access_token'); // Store new access token

        // Try to access with old access token
        await pactum
          .spec()
          .get('/user')
          .withHeaders({
            Authorization: `Bearer ${previousAccessToken}`,
          })
          .expectStatus(401);
      });
    });
  });

  describe('Swipe default', () => {
    describe('getNextMovieToSwipe', async () => {
      let movieId: number;

      it('Should getNextMovieToSwipe', async () => {
        let responseBody;

        await pactum
          .spec()
          .get('/swipe/next')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        movieId = responseBody[0].id;
      });

      it('Rate previous movie then should get different NextMovieToSwipe', async () => {
        await pactum.sleep(200);
        // Rate this movie
        await rateMovie(movieId.toString(), 'liked');

        return pactum
          .spec()
          .get('/swipe/next')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expect((res) => {
            if (JSON.stringify(res.res.body).includes('"id":' + movieId.toString)) {
              throw new Error('Got the same movie as before, even though it was rated');
            }
          });
      });

      it('undo last swipe and rate again', async () => {
        await pactum
          .spec()
          .put('/swipe/undo')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike({
            id: movieId,
          });

        await rateMovie(movieId.toString(), 'liked');
      });
    });
  });

  describe('Swipe advanced test', () => {
    it('create new user for swipe test', async () => {
      await pactum
        .spec()
        .post('/auth/signup')
        .withBody({
          email: 'testUser@test.de',
          password: 'test',
          firstName: 'testFirst',
          lastName: 'testLast',
        })
        .expectStatus(201)
        .stores('user2At', 'access_token');
    });

    it('Should getNextMoviesToSwipe with movies rated by user 1 at the start of the list and no duplicates', async () => {
      let responseBody;
      await pactum
        .spec()
        .get('/swipe/next')
        .withHeaders({
          Authorization: 'Bearer $S{user2At}',
        })
        .expectStatus(200)
        .toss()
        .then((res) => {
          responseBody = res.body;
        });

      expect(responseBody.length).toBeGreaterThanOrEqual(40);

      for (let i = 0; i < responseBody.length; i++) {
        if (i === 0 || i === 1) {
          if (responseBody[i].id !== 100 && responseBody[i].id !== 102) {
            throw new Error('Movies rated by user not 1 at the start of the list');
          }
        }
        for (let j = i + 1; j < responseBody.length; j++) {
          if (responseBody[i].id === responseBody[j].id) {
            throw new Error('Duplicate movie found');
          }
        }
      }
    });
  });

  describe('Tournament', () => {
    describe('Before ranking', () => {
      it('Should return empty rankings', async () => {
        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike([]);
      });

      it('Should get match with 2 fresh movies', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/tournament/matchup')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike({
            interactionStatus: 'liked',
          })
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        await assertTournamentRatingDoesntExistsInDb(responseBody.movies[0].id, responseBody.movies[1].id, 'liked');
        await assertTournamentRatingDoesntExistsInDb(responseBody.movies[1].id, responseBody.movies[0].id, 'liked');
        await assertTournamentRatingDoesntExistsInDb(responseBody.movies[0].id, responseBody.movies[1].id, 'disliked');
        await assertTournamentRatingDoesntExistsInDb(responseBody.movies[1].id, responseBody.movies[0].id, 'disliked');
      });
    });

    describe('rank', () => {
      it('Should throw if winnerId and loserId are the same', () => {
        return pactum
          .spec()
          .post('/tournament/rank')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            winnerId: 100,
            loserId: 100,
          })
          .expectStatus(400);
      });

      it('Should throw if user has not swiped both movies', () => {
        return pactum
          .spec()
          .post('/tournament/rank')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            winnerId: 100,
            loserId: 103,
          })
          .expectStatus(400);
      });

      it('Should throw if user has not swiped both movies with the same status', () => {
        return pactum
          .spec()
          .post('/tournament/rank')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            winnerId: 100,
            loserId: 101,
          })
          .expectStatus(400);
      });

      it('Should rank movie 100 over 102', async () => {
        await pactum
          .spec()
          .post('/tournament/rank')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            winnerId: 100,
            loserId: 102,
          })
          .expectStatus(201);

        await assertTournamentRatingExistsInDb(100, 102, 'liked');
      });

      it('Should update matchup to rank movie 102 over 100', async () => {
        await pactum
          .spec()
          .post('/tournament/rank')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            winnerId: 102,
            loserId: 100,
          })
          .expectStatus(201);

        await assertTournamentRatingExistsInDb(102, 100, 'liked');
      });

      it('Should dislike both movies, then rank them again but now in dislike list', async () => {
        await rateMovie('102', 'disliked');
        await rateMovie('100', 'disliked');

        await playOutTournamentMatchup(100, 102);

        await assertTournamentRatingExistsInDb(100, 102, 'disliked');
        await assertTournamentRatingDoesntExistsInDb(100, 102, 'liked');
      });

      it('Should undo last ranking and then rank again', async () => {
        await pactum
          .spec()
          .put('/tournament/rank/undo')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike({
            movies: [
              {
                id: 100,
              },
              {
                id: 102,
              },
            ],
          });

        await playOutTournamentMatchup(100, 102);
      });

      it('Should throw if deleting non-existing ranking', () => {
        return pactum
          .spec()
          .delete('/tournament/rank/liked/102')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(404);
      });

      it('Should delete ranking and redo it', async () => {
        await pactum
          .spec()
          .delete('/tournament/rank/disliked/100')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200);

        await assertTournamentRatingDoesntExistsInDb(100, 102, 'disliked');

        await playOutTournamentMatchup(100, 102);

        await assertTournamentRatingExistsInDb(100, 102, 'disliked');
        await assertTournamentRatingDoesntExistsInDb(100, 102, 'liked');
      });

      it('Should add some more movies to rankings for later', async () => {
        await rateMovie('101', 'disliked');
        await rateMovie('103', 'disliked');
        await rateMovie('104', 'disliked');
        await rateMovie('105', 'disliked');
        // Swipe this one but don't rank it, leaving it unranked
        await rateMovie('106', 'disliked');

        await playOutTournamentMatchup(100, 101); // Winner: 100
        await playOutTournamentMatchup(101, 102); // Winner: 101
        await playOutTournamentMatchup(101, 105); // Winner: 101
        await playOutTournamentMatchup(101, 104); // Winner: 101
        await playOutTournamentMatchup(102, 103); // Winner: 102
        await playOutTournamentMatchup(102, 104); // Winner: 102
        await playOutTournamentMatchup(103, 104); // Winner: 103
        await playOutTournamentMatchup(104, 105); // Winner: 104
      });
    });

    describe('rankings', () => {
      it('Should get rankings for disliked movies in right expected order', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike([
            {
              id: 104,
            },
            {
              id: 100,
            },
            {
              id: 101,
            },
            {
              id: 102,
            },
            {
              id: 105,
            },
            {
              id: 103,
            },
            {
              id: 106,
            },
          ])
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        for (let i = 1; i < responseBody.length; i++) {
          if (i === responseBody.length - 1) {
            if (responseBody[i].rank !== '?') {
              throw new Error(`Rank of last item is not ?`);
            }
          } else if (i > 0 && responseBody[i].id < responseBody[i - 1].id && responseBody[i].rank < responseBody[i - 1].rank) {
            throw new Error(`Id or rank of item at index ${i} is not greater than or equal to id of previous item`);
          }
        }
      });

      it('Should get rankings for liked movies, which is just one unranked one', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/tournament/rankings/liked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike([
            {
              rank: '?',
            },
          ])
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        // The one got from swiping from popular movies and then liked but never ranked
        expect(responseBody.length).toBe(1);
      });

      it('Should dislike 2 new movies, then rank them against each other, then change interactionStatus of one, which should remove them from dislike rankings', async () => {
        await rateMovie('107', 'disliked');
        await rateMovie('108', 'disliked');

        await playOutTournamentMatchup(107, 108);

        await assertTournamentRatingExistsInDb(107, 108, 'disliked');
        await assertTournamentRatingDoesntExistsInDb(107, 108, 'liked');

        await rateMovie('107', 'liked');

        await assertTournamentRatingDoesntExistsInDb(107, 108, 'disliked');
        await assertTournamentRatingDoesntExistsInDb(107, 108, 'liked');

        await pactum
          .spec()
          .get('/tournament/rankings/liked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike([
            {
              id: 107,
              rank: '?',
            },
          ]);

        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike([
            {
              id: 108,
              rank: '?',
            },
          ])
          .expect((res) => {
            if (res.res.body.some((s) => s.id === 107)) {
              throw new Error('Movie 107 should not be in disliked rankings anymore');
            }
          });

        // For next tests
        await prisma.movie.deleteMany({ where: { id: { in: [107, 108] } } });
      });
    });

    describe('matches after ranking', () => {
      it('Should get match with one unranked one', async () => {
        // Cannot be like as only one movie there (the popular one got from swiping)
        // Has to include movie 106 as not yet ranked disliked one
        await pactum
          .spec()
          .get('/tournament/matchup')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike({
            movies: [
              {
                id: 106,
              },
            ],
            interactionStatus: 'disliked',
          });
      });

      it('Should get matches and rank them, never getting duplicates, empty response when all ranked', async () => {
        await rateMovie('108', 'disliked');
        await rateMovie('109', 'disliked');
        const movieIdIterations: number[][] = [];

        // 10 Matchups missing until complete and no more matchups without cycles
        for (let i = 0; i < 10; i++) {
          movieIdIterations.push((await getMatchupResponse()).movies.map((m) => m.id));
          await playOutTournamentMatchup(
            movieIdIterations[movieIdIterations.length - 1][0],
            movieIdIterations[movieIdIterations.length - 1][1],
          );
        }

        // Iterate over movieIdIterations and make sure theres no arrays containing the same two ids, where order doesn't matter
        for (let i = 0; i < movieIdIterations.length; i++) {
          for (let j = i + 1; j < movieIdIterations.length; j++) {
            if (
              (movieIdIterations[i][0] === movieIdIterations[j][0] && movieIdIterations[i][1] === movieIdIterations[j][1]) ||
              (movieIdIterations[i][0] === movieIdIterations[j][1] && movieIdIterations[i][1] === movieIdIterations[j][0])
            ) {
              throw new Error(`Duplicate matchup found at indexes ${i} and ${j}`);
            }
          }
        }

        // Should get empty response, all movies ranked against each other
        await pactum
          .spec()
          .get('/tournament/matchup')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLike({
            movies: [],
            interactionStatus: 'undefined',
          });
      });
    });

    describe('cycle', () => {
      it('Should say there is no circle', async () => {
        await pactum
          .spec()
          .get('/tournament/cycle/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectBodyContains('false');
      });

      it('Should not allow the matchup as it would create a cycle', async () => {
        await pactum
          .spec()
          .post('/tournament/rank')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            winnerId: 102,
            loserId: 100,
          })
          .expectStatus(400);
      });
    });

    describe('force movie rankings', () => {
      it('should fail for invalid interaction status', async () => {
        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/invalid-status')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId: 102,
            aboveMovieId: 100,
            belowMovieId: 100,
          })
          .expectStatus(400);
      });

      it('should fail for same aboveMovieId and belowMovieId', async () => {
        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId: 102,
            aboveMovieId: 100,
            belowMovieId: 100,
          })
          .expectStatus(400);
      });

      it('should fail for same belowMovieId as movieId', async () => {
        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId: 100,
            aboveMovieId: 103,
            belowMovieId: 100,
          })
          .expectStatus(400);
      });

      it('should fail for not ranked aboveMovieId', async () => {
        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId: 102,
            aboveMovieId: 110,
            belowMovieId: 100,
          })
          .expectStatus(400);
      });

      it('should fail for incorrect interaction_status', async () => {
        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/liked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId: 102,
            aboveMovieId: 106,
            belowMovieId: 100,
          })
          .expectStatus(400);
      });

      it('force movie rankings successfully', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        const medianRank = Math.floor(responseBody.length / 2);
        const aboveMovieId = responseBody.find((m) => m.rank === (medianRank - 1).toString()).id;
        const belowMovieId = responseBody.find((m) => m.rank === medianRank.toString()).id;
        const movie = responseBody.find((m) => m.rank === (responseBody.length - 2).toString());
        const movieRank = movie.rank;
        const movieId = movie.id;

        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId,
            aboveMovieId,
            belowMovieId,
          })
          .expectStatus(200);

        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        for (let i = 0; i < responseBody.length; i++) {
          if (responseBody[i].id === aboveMovieId) {
            if (responseBody[i + 1].id !== movieId) {
              throw new Error(`Movie ${movieId} is not above movie ${aboveMovieId}`);
            }
            if (responseBody[i + 2].id !== belowMovieId) {
              throw new Error(`Movie ${movieId} is not below movie ${belowMovieId}`);
            }
            if (Number(responseBody[i + 1].rank) >= Number(movieRank)) {
              throw new Error(`Movie ${movieId} is not ranked higher than before`);
            }
            break;
          }
        }
      });

      it('force movie rankings fail because of cycle', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        const medianRank = Math.floor(responseBody.length / 2);
        const belowMovie = responseBody.find((m) => m.rank === (medianRank - 1).toString());
        const belowMovieId = belowMovie.id;
        const belowMovieRank = belowMovie.rank;
        const aboveMovie = responseBody.find((m) => m.rank === medianRank.toString());
        const aboveMovieId = aboveMovie.id;
        const aboveMovieRank = aboveMovie.rank;
        const movie = responseBody.find((m) => m.rank === (responseBody.length - 2).toString());
        const movieRank = movie.rank;
        const movieId = movie.id;

        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId,
            aboveMovieId,
            belowMovieId,
          })
          .expectStatus(400)
          .expectJsonLike({
            message: 'This ranking would create a cylce',
          });

        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        for (let i = 0; i < responseBody.length; i++) {
          if (responseBody[i].id === aboveMovieId && responseBody[i].rank !== aboveMovieRank) {
            throw new Error(`Movie ${aboveMovieId} has wrongfully changed rank`);
          } else if (responseBody[i].id === belowMovieId && responseBody[i].rank !== belowMovieRank) {
            throw new Error(`Movie ${belowMovieId} has wrongfully changed rank`);
          } else if (responseBody[i].id === movieId && responseBody[i].rank !== movieRank) {
            throw new Error(`Movie ${movieId} has wrongfully changed rank`);
          }
        }

        await pactum
          .spec()
          .get('/tournament/cycle/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectBodyContains('false');
      });

      it('Should force movie rank to top', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        const belowMovieId = responseBody[0].id;
        const movie = responseBody.find((m) => m.rank === (responseBody.length - 1).toString());
        const movieId = movie.id;

        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId,
            belowMovieId,
          })
          .expectStatus(200);

        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        if (responseBody[0].id !== movieId) {
          throw new Error(`Movie ${movieId} is not at the top`);
        }
      });

      it('Should force movie rank to bottom', async () => {
        let responseBody;
        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        const aboveMovieId = responseBody[responseBody.length - 1].id;
        const movieId = responseBody[0].id;

        await pactum
          .spec()
          .put('/tournament/forceMoviePlacement/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody({
            movieId,
            aboveMovieId,
          })
          .expectStatus(200);

        await pactum
          .spec()
          .get('/tournament/rankings/disliked')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .toss()
          .then((res) => {
            responseBody = res.body;
          });

        if (responseBody[responseBody.length - 1].id !== movieId) {
          throw new Error(`Movie ${movieId} is not at the bottom`);
        }
      });
    });
  });

  describe('recommendations', () => {
    it('Should prepare recs', async () => {
      await rateMovie('200', 'liked');
      await rateMovie('201', 'liked');
      await rateMovie('203', 'liked');
      await rateMovie('204', 'liked');
    });

    it('Should get recommendations', async () => {
      let responseBody;

      await pactum
        .spec()
        .get('/recs')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .expectStatus(200)
        .toss()
        .then((res) => {
          responseBody = res.body;
        });

      expect(responseBody.movies.length).toBeGreaterThan(0);

      for (let i = 0; i < responseBody.movies.length; i++) {
        // await assertRecommendationExistsInDb(responseBody.movies[i].id);
        // ^cannot do this if not awaiting the prsima insert in the cache service, maybe once theres other tests after this
        await assertUserMovieRatingDoesntExistsInDb(responseBody.movies[i].id);
      }
    });
  });

  describe('Advanced Ranking', () => {
    it('Should prepare setting by deleting all previous related data', async () => {
      await prisma.tournamentRating.deleteMany();
      await prisma.userMovieRating.deleteMany();
    });

    it('Should like 20 movies', async () => {
      await rateMovie('300', 'liked');
      await rateMovie('301', 'liked');
      await rateMovie('302', 'liked');
      await rateMovie('303', 'liked');
      await rateMovie('306', 'liked');
      await rateMovie('307', 'liked');
      await rateMovie('308', 'liked');
      await rateMovie('309', 'liked');
      await rateMovie('310', 'liked');
      await rateMovie('311', 'liked');
      await rateMovie('312', 'liked');
      await rateMovie('312', 'liked');
      await rateMovie('313', 'liked');
      await rateMovie('314', 'liked');
      await rateMovie('315', 'liked');
      await rateMovie('316', 'liked');
      await rateMovie('317', 'liked');
      await rateMovie('318', 'liked');
      await rateMovie('319', 'liked');
      await rateMovie('320', 'liked');
    }, 10000);

    it('Should follow rating them by using pre-defined pattern', async () => {
      let response = await getMatchupResponse();
      while (response.movies.length > 0) {
        const winnerId = response.movies[0].id > response.movies[1].id ? response.movies[0].id : response.movies[1].id;
        const loserId = response.movies[0].id < response.movies[1].id ? response.movies[0].id : response.movies[1].id;
        await playOutTournamentMatchup(winnerId, loserId);
        response = await getMatchupResponse();
      }
    });

    it('Should drag around a bit', async () => {
      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 300,
          aboveMovieId: 308,
          belowMovieId: 307,
        })
        .expectStatus(200);

      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 307,
          aboveMovieId: 313,
          belowMovieId: 312,
        })
        .expectStatus(200);

      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 319,
          aboveMovieId: 313,
          belowMovieId: 312,
        })
        .expectStatus(200);

      // And now back
      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 307,
          aboveMovieId: 308,
          belowMovieId: 306,
        })
        .expectStatus(200);

      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 300,
          aboveMovieId: 301,
        })
        .expectStatus(200);

      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 319,
          aboveMovieId: 320,
          belowMovieId: 318,
        })
        .expectStatus(200);
    });

    it('Should like new movies and rank again, then move around', async () => {
      await rateMovie('321', 'liked');
      await rateMovie('322', 'liked');
      await rateMovie('326', 'liked');
      await rateMovie('327', 'liked');

      let response = await getMatchupResponse();
      while (response.movies.length > 0) {
        const winnerId = response.movies[0].id > response.movies[1].id ? response.movies[0].id : response.movies[1].id;
        const loserId = response.movies[0].id < response.movies[1].id ? response.movies[0].id : response.movies[1].id;
        await playOutTournamentMatchup(winnerId, loserId);
        response = await getMatchupResponse();
      }

      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 327,
          aboveMovieId: 300,
        })
        .expectStatus(200);

      await pactum
        .spec()
        .put('/tournament/forceMoviePlacement/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .withBody({
          movieId: 327,
          belowMovieId: 326,
        })
        .expectStatus(200);
    });

    it('Should confirm that linked rankings are id desc', async () => {
      let responseBody;
      await pactum
        .spec()
        .get('/tournament/rankings/liked')
        .withHeaders({
          Authorization: 'Bearer $S{userAt}',
        })
        .expectStatus(200)
        .toss()
        .then((res) => {
          responseBody = res.body;
        });

      for (let i = 1; i < responseBody.length; i++) {
        if (Number(responseBody[i].id) > Number(responseBody[i - 1].id)) {
          throw new Error('Rankings are not in order');
        }
      }
    });
  });

  // ------------------ Helper functions ------------------

  async function assertMovieExistsInDb(id?: number, maxAttempts = 3, delay = 200) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const movies = await prisma.movie.findMany(id ? { where: { id: id } } : null);
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
    throw new Error(`Movie with ${id ? 'id ' + id : 'any id'} not found in database after ${maxAttempts} attempts.`);
  }

  async function assertUserMovieRatingExistsInDb(
    movieId: number,
    expectedInteractionStatus: string,
    userIdTemp = userId,
    maxAttempts = 3,
    delay = 200,
  ) {
    let attempts = 0;
    const query = { where: { userId: userIdTemp, movieId } };

    while (attempts < maxAttempts) {
      const ratings = await prisma.userMovieRating.findMany(query);
      if (ratings.length > 1) {
        throw new Error(`Multiple ratings found for user ${userIdTemp} and movie ${movieId}`);
      }
      if (ratings.length > 0 && ratings[0].interactionStatus === expectedInteractionStatus) {
        return; // Rating with specified interactionStatus and movieId for userIdTemp found, exit the function
      } else if (ratings.length > 0 && ratings[0].interactionStatus !== expectedInteractionStatus) {
        throw new Error(`Rating with movieId ${movieId} for user ${userIdTemp} found in database but with wrong interactionStatus.`);
      }

      // Wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    // If the loop completes without returning, throw an error
    throw new Error(`Rating for movieId ${movieId} and user ${userIdTemp} not found in database after ${maxAttempts} attempts.`);
  }

  async function assertUserMovieRatingDoesntExistsInDb(movieId: number, userIdTemp = userId) {
    const query = { where: { userId: userIdTemp, movieId } };
    const ratings = await prisma.userMovieRating.findMany(query);
    if (ratings.length > 0) {
      throw new Error(`Rating with movieId ${movieId} for user ${userIdTemp} found in database.`);
    }
  }

  async function assertTournamentRatingExistsInDb(
    winnerId: number,
    loserId: number,
    interactionStatus: string,
    maxAttempts = 3,
    delay = 200,
  ) {
    let attempts = 0;
    const query = {
      where: {
        winnerId,
        interactionStatus,
        OR: [
          { movie1Id: winnerId, movie2Id: loserId },
          { movie1Id: loserId, movie2Id: winnerId },
        ],
      },
    };

    while (attempts < maxAttempts) {
      const rankings = await prisma.tournamentRating.findMany(query);
      if (rankings.length > 1) {
        throw new Error(`Multiple rankings found for winner ${winnerId} and loser ${loserId}`);
      }
      if (rankings.length > 0) {
        return; // Ranking with specified winnerId and loserId found, exit the function
      }

      // Wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    // If the loop completes without returning, throw an error
    throw new Error(
      `${interactionStatus} ranking for winner ${winnerId} and loser ${loserId} not found in database after ${maxAttempts} attempts.`,
    );
  }

  async function assertTournamentRatingDoesntExistsInDb(winnerId: number, loserId: number, interactionStatus: string) {
    const query = {
      where: {
        winnerId,
        interactionStatus,
        OR: [
          { movie1Id: winnerId, movie2Id: loserId },
          { movie1Id: loserId, movie2Id: winnerId },
        ],
      },
    };

    const rankings = await prisma.tournamentRating.findMany(query);
    if (rankings.length > 0) {
      throw new Error(`Unexpected ranking found for winner ${winnerId} and loser ${loserId}`);
    }

    return;
  }

  async function assertRecommendationExistsInDb(movieId: number, maxAttempts = 3, delay = 200) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const recommendations = await prisma.movieRecommedation.findMany({ where: { recommendationMovieId: movieId } });
      if (recommendations.length > 0) {
        return; // Recommendation with specified movieId found, exit the function
      }

      // Wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    // If the loop completes without returning, throw an error
    throw new Error(`Recommendation with movieId ${movieId} not found in database after ${maxAttempts} attempts.`);
  }

  async function playOutTournamentMatchup(winnerId: number, loserId: number) {
    await pactum
      .spec()
      .post('/tournament/rank')
      .withHeaders({
        Authorization: 'Bearer $S{userAt}',
      })
      .withBody({
        winnerId: winnerId,
        loserId: loserId,
      })
      .expectStatus(201);
  }

  async function rateMovie(movieId: string, interactionStatus: string) {
    await pactum
      .spec()
      .post('/movie/{id}/rate/{action}')
      .withHeaders({
        Authorization: 'Bearer $S{userAt}',
      })
      .withPathParams('id', movieId)
      .withPathParams('action', interactionStatus)
      .expectStatus(201);
  }

  async function getMatchupResponse(): Promise<MatchupDto> {
    let body;
    await pactum
      .spec()
      .get('/tournament/matchup')
      .withHeaders({
        Authorization: 'Bearer $S{userAt}',
      })
      .expectStatus(200)
      .toss()
      .then((res) => {
        body = res.body;
      });

    return body;
  }
});
