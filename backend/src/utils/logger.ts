/**
 * Request/Response 로깅 유틸리티
 * 민감한 정보(토큰, 패스워드 등)는 자동으로 마스킹
 */

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  method: string;
  path: string;
  status?: number;
  duration?: number;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string;
}

const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
];

/**
 * 민감한 값들을 마스킹
 */
function maskSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))) {
      masked[key] = '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * 로그 엔트리를 포맷하고 출력
 */
function formatLog(entry: LogEntry): string {
  const baseLog = `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.method} ${entry.path}`;

  if (entry.status !== undefined) {
    const statusColor = entry.status >= 400 ? '❌' : '✓';
    return `${baseLog} ${statusColor} ${entry.status}${entry.duration ? ` (+${entry.duration}ms)` : ''}`;
  }

  return baseLog;
}

/**
 * 로그 출력 (콘솔 + 상세 정보)
 */
export function logRequest(method: string, path: string, body?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    method,
    path,
    request: body ? maskSensitiveData(body) : undefined,
  };

  console.log(formatLog(entry));
  if (body) {
    console.log('[Request Body]', JSON.stringify(entry.request, null, 2));
  }
}

/**
 * 응답 로그 출력
 */
export function logResponse(
  method: string,
  path: string,
  status: number,
  duration: number,
  responseData?: any
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: status >= 400 ? 'error' : 'info',
    method,
    path,
    status,
    duration,
    response: responseData ? maskSensitiveData(responseData) : undefined,
  };

  console.log(formatLog(entry));
  if (responseData) {
    console.log('[Response Body]', JSON.stringify(entry.response, null, 2));
  }
}

/**
 * 에러 로그 출력
 */
export function logError(
  method: string,
  path: string,
  error: Error | unknown,
  duration?: number
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    method,
    path,
    error: error instanceof Error ? error.message : String(error),
    duration,
  };

  console.error(formatLog(entry));
  if (error instanceof Error) {
    console.error('[Error Stack]', error.stack);
  }
}
