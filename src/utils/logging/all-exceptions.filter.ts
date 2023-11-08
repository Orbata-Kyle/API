import { AxiosError } from 'axios';
import {
  Catch,
  ExceptionFilter,
  HttpException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import logger from '../../utils/logging/winston-config';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      // Normal error handling handles normal wanted exceptions
      super.catch(exception, host);
      return;
    } else if (exception instanceof AxiosError) {
      const message = {
        message: exception.message,
        statusCode: exception.response?.status,
        statusText: exception.response?.data?.status_message,
      };
      logger.error(
        `${request.method} ${request.url} AxiosError: ${JSON.stringify(
          message,
        )}`,
      );
    } else if (exception instanceof Error) {
      const message = exception.message;
      logger.error(`${request.method} ${request.url} Error: ${message}`);
    } else {
      const message = 'Internal Server Error';
      logger.error(`${request.method} ${request.url} Error: ${message}`);
    }

    const status: number = HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      error: 'Internal Server Error',
    });
  }
}
