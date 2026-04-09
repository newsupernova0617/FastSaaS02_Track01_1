/**
 * 요청/응답 로깅 미들웨어
 * 모든 API 요청과 응답을 기록
 */

import { createMiddleware } from 'hono/factory';
import { logRequest, logResponse, logError } from '../utils/logger';
import type { Env } from '../db/index';
import type { Variables } from './auth';

export const loggingMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;
    const startTime = Date.now();

    let requestBody: any = undefined;

    // GET 요청이 아닌 경우 요청 본문 로깅
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        // 요청 본문을 읽음
        const contentType = c.req.header('content-type');
        if (contentType?.includes('application/json')) {
          requestBody = await c.req.json().catch(() => undefined);
        }
      } catch (err) {
        // 요청 본문이 JSON이 아닌 경우 무시
      }
    }

    logRequest(method, path, requestBody);

    try {
      // 응답 객체를 감싸서 로깅하기 위해 next() 호출
      await next();

      // 응답 상태 코드 및 본문 로깅
      const status = c.res.status;
      const duration = Date.now() - startTime;

      let responseBody: any = undefined;

      // 응답 본문을 읽을 수 있으면 로깅
      try {
        const contentType = c.res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          // 응답 본문도 clone해서 읽음
          const cloned = c.res.clone();
          responseBody = await cloned.json().catch(() => undefined);
        }
      } catch (err) {
        // 응답 본문을 읽을 수 없는 경우 무시
      }

      logResponse(method, path, status, duration, responseBody);
    } catch (err) {
      const duration = Date.now() - startTime;
      logError(method, path, err, duration);
      throw err;
    }
  }
);
