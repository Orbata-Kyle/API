import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logging/winston-config';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const { method, body, query, params } = request;
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
      const loggedResponseBody = responseBody && responseBody.length > 100 ? responseBody.substring(0, 150) + '...' : responseBody;

      const sanitize = (obj: any) => {
        // Prevent logging of sensitive data
        const keywords = ['pw', 'password', 'Password', 'newPassword'];
        const newObj = { ...obj };
        Object.keys(newObj).forEach((key) => {
          if (keywords.includes(key)) {
            newObj[key] = '***';
          }
        });
        return newObj;
      };

      const sanitizedBody = sanitize(body);
      const sanitizedQuery = sanitize(query);

      // Serialize and truncate request body and query params
      const loggedRequestBody =
        JSON.stringify(sanitizedBody).length > 100
          ? JSON.stringify(sanitizedBody).substring(0, 100) + '...'
          : JSON.stringify(sanitizedBody);
      const loggedRequestQuery =
        JSON.stringify(sanitizedQuery).length > 100
          ? JSON.stringify(sanitizedQuery).substring(0, 100) + '...'
          : JSON.stringify(sanitizedQuery);
      const loggedRequestParams =
        JSON.stringify(params).length > 100 ? JSON.stringify(params).substring(0, 100) + '...' : JSON.stringify(params);

      logger.http(
        `${statusCode} ${method} ${
          JSON.parse(loggedRequestParams)['0']
        } - ${elapsed}ms | Body: ${loggedRequestBody} - Query: ${loggedRequestQuery} | ResBody: ${loggedResponseBody}`,
      );
    });

    next();
  }
}
