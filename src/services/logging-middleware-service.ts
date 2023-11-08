import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import logger from '../utils/logging/winston-config';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method } = request;
    const start = Date.now();

    response.on('finish', () => {
      const { statusCode } = response;
      const elapsed = Date.now() - start;
      logger.http(
        ` ${statusCode} ${method} ${request.route?.path} - ${ip} - ${elapsed}ms`,
      );
    });

    next();
  }
}
