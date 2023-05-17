import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, SimilarityService],
})
export class AppModule {}
