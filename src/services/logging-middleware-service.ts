import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logging/winston-config';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method } = request;
    const start = Date.now();
    let responseBody = '';

    const originalSend = response.send;

    // Override response.send with rest parameters
    response.send = function (...args: any[]) {
      responseBody = args[0];
      return originalSend.apply(this, args);
    };

    response.on('finish', () => {
      const { statusCode } = response;
      const elapsed = Date.now() - start;

      // Log response body with a length check
      const loggedBody = responseBody.length > 100 ? responseBody.substring(0, 150) + '...' : responseBody;

      logger.http(`${statusCode} ${method} ${request.route?.path} - ${ip} - ${elapsed}ms - Response: ${loggedBody}`);
    });

    next();
  }
}
