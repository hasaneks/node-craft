import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

// Clients depend on this shape: { statusCode, error, message }.
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      return res.status(status).json({ statusCode: status, error: exception.name, message });
    }
    this.logger.error(exception);
    return res.status(500).json({ statusCode: 500, error: 'InternalServerError', message: 'Internal server error' });
  }
}
