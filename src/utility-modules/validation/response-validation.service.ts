import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import logger from '../../utils/logging/winston-config';

@Injectable()
export class ResponseValidationService {
  constructor(private readonly configService: ConfigService) {}

  async validateResponse<V, T extends object>(response: V, classType: ClassConstructor<T>): Promise<T> {
    const convertedResponse = plainToInstance<T, V>(classType, response);
    if (this.configService.get('env') !== 'prod') {
      const validationErrors = await validate(convertedResponse, {
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        whitelist: true,
        enableDebugMessages: true,
        validationError: { target: true, value: true },
      });
      if (validationErrors.length > 0) {
        for (const error of validationErrors) {
          logger.error(error);
        }
        throw new InternalServerErrorException(validationErrors);
      } else {
        return convertedResponse;
      }
    } else {
      return convertedResponse;
    }
  }

  async validateArrayResponse<V, T extends object>(responseArray: V[], classType: ClassConstructor<T>): Promise<T[]> {
    const isProd = this.configService.get('env') === 'prod';
    const convertedResponseArray = responseArray.map((item) => plainToInstance(classType, item));

    if (!isProd) {
      for (const item of convertedResponseArray) {
        const validationErrors = await validate(item, {
          forbidNonWhitelisted: true,
          forbidUnknownValues: true,
          whitelist: true,
          enableDebugMessages: true,
          validationError: { target: false, value: true },
        });

        if (validationErrors.length > 0) {
          logger.error(validationErrors);
          throw new InternalServerErrorException(validationErrors);
        }
      }
    }

    return convertedResponseArray;
  }
}
