import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { toErrorBody } from './http-error';

/**
 * Global catch-all (registered via APP_FILTER in AppModule): every error leaves the API as the
 * one ErrorBody shape. 5xx are logged with their stack here — the client only sees the envelope.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(HttpExceptionFilter.name);
  private readonly ws = new BaseWsExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost): void {
    // Global filters also wrap the Socket.IO gateway; that context has no HTTP response to write.
    if (host.getType() !== 'http') return this.ws.catch(exception, host);

    const http = host.switchToHttp();
    const req = http.getRequest<{ originalUrl?: string; url: string }>();
    const res = http.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();

    const body = toErrorBody(exception, req.originalUrl ?? req.url);
    if (body.statusCode >= 500) {
      this.log.error(`${body.code} ${body.path}`, exception instanceof Error ? exception.stack : String(exception));
    }
    res.status(body.statusCode).json(body);
  }
}
