import { Module } from '@nestjs/common';
import { PeopleCacheModule } from '../../utility-modules/people-cache/db-people-cache.module';
import { PeopleController } from './people.controller';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { PeopleService } from './people.service';

@Module({
  imports: [PeopleCacheModule],
  controllers: [PeopleController],
  providers: [PrismaService, PeopleService],
})
export class PeopleModule {}
