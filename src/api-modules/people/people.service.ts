import { Injectable } from '@nestjs/common';
import { PeopleCacheService } from '../../utility-modules/people-cache/db-people-cache.service';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService, private readonly movieCache: PeopleCacheService) {}
}
