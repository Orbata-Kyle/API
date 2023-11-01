import { after, describe } from 'node:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '../src/utils/logging/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    prisma = app.get(PrismaService);
    await prisma.cleanDb();
  });

  afterAll(async () => {
    app.close();
  });

  describe('Auth', () => {
    describe('Signup', () => {
      it.todo('Should create a new user');
    });

    describe('Signin', () => {
      it.todo('Should Sign in');
    });

    describe('Movie', () => {
      describe('searchForMovieByTitle', () => {
        it.todo('Should searchForMovieByTitle');
      });

      describe('getMovieById', () => {
        it.todo('Should getMovieById');
      });

      describe('rateMovieById', () => {
        it.todo('Should rateMovieById');
      });
    });

    describe('User', () => {
      describe('retireveOwnUser', () => {
        it.todo('Should retireveOwnUser');
      });

      describe('retrieveOwnRatings', () => {
        it.todo('Should retrieveOwnRatings');
      });
    });

    describe('Swipe', () => {
      describe('getNextMovieToSwipe', () => {
        it.todo('Should getNextMovieToSwipe');
      });
    });
  });
});
