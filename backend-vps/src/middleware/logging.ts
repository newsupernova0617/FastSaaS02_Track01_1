import { createMiddleware } from 'hono/factory';
import { logRequest, logResponse, logError } from '../utils/logger';
import type { Env } from '../db/index';
import type { Variables } from './auth';

export const loggingMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;
    const startTime = Date.now();

    logRequest(method, path);

    try {
      await next();

      const status = c.res.status;
      const duration = Date.now() - startTime;
      logResponse(method, path, status, duration);
    } catch (err) {
      const duration = Date.now() - startTime;
      logError(method, path, err, duration);
      throw err;
    }
  }
);

/*
Legacy request/response body logging kept for rollback/reference only.

let requestBody: any = undefined;
if (method !== 'GET' && method !== 'HEAD') {
  const contentType = c.req.header('content-type');
  if (contentType?.includes('application/json')) {
    requestBody = await c.req.json().catch(() => undefined);
  }
}
logRequest(method, path, requestBody);

const cloned = c.res.clone();
const responseBody = await cloned.json().catch(() => undefined);
logResponse(method, path, status, duration, responseBody);
*/
