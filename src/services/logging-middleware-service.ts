import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logging/winston-config';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, body, query, params } = request;
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
      const loggedResponseBody = responseBody.length > 100 ? responseBody.substring(0, 150) + '...' : responseBody;

      // Serialize and truncate request body and query params
      const loggedRequestBody = JSON.stringify(body).length > 100 ? JSON.stringify(body).substring(0, 100) + '...' : JSON.stringify(body);
      const loggedRequestQuery =
        JSON.stringify(query).length > 100 ? JSON.stringify(query).substring(0, 100) + '...' : JSON.stringify(query);
      const loggedRequestParams =
        JSON.stringify(params).length > 100 ? JSON.stringify(params).substring(0, 100) + '...' : JSON.stringify(params);

      logger.http(
        `${statusCode} ${method} ${request.route?.path} - ${elapsed}ms | Body: ${loggedRequestBody} - Query: ${loggedRequestQuery} - Params: ${loggedRequestParams} | ResBody: ${loggedResponseBody}`,
      );
    });

    next();
  }
}
