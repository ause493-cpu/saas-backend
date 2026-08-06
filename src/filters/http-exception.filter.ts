import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Response } from 'express';
import { isDatabaseConnectionLimitError } from '../providers/prisma/prisma.connection';

// If you have a Sentry DSN, add it here for error tracking and uncomment the Sentry lines (12, 28)
// Sentry.init({ dsn: '' });

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      return response.status(status).json(exception.getResponse());
    }

    if (isDatabaseConnectionLimitError(exception)) {
      response.setHeader('Retry-After', '5');

      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'The service is temporarily busy. Please retry shortly.',
        error: 'Service unavailable',
      });
    }

    // Sentry.captureException(exception);

    response.status(status).json({
      statusCode: status,
      message: 'We got an error in processing this request',
      error: 'Internal server error',
    });
  }
}
