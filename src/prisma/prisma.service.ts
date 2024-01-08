import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import logger from '../utils/logging/winston-config';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private config: ConfigService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async cleanDb() {
    if (this.config.get('ENV') !== 'test') throw new Error('Cannot clean whole db in non-test environment');
    else {
      logger.info('Cleaning DB');
      return this.$transaction([this.userMovieRating.deleteMany(), this.movie.deleteMany(), this.user.deleteMany()]);
    }
  }
}
