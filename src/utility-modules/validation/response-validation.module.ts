import { Global, Module } from '@nestjs/common';
import { ResponseValidationService } from './response-validation.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [ResponseValidationService],
  exports: [ResponseValidationService],
})
export class ResponseValidationModule {}
