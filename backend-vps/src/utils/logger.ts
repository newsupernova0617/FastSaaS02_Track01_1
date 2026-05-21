interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  method: string;
  path: string;
  status?: number;
  duration?: number;
  error?: string;
}

function formatLog(entry: LogEntry): string {
  const baseLog = `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.method} ${entry.path}`;

  if (entry.status !== undefined) {
    return `${baseLog} ${entry.status}${entry.duration !== undefined ? ` (+${entry.duration}ms)` : ''}`;
  }

  return `${baseLog}${entry.error ? ` ${entry.error}` : ''}${entry.duration !== undefined ? ` (+${entry.duration}ms)` : ''}`;
}

export function logRequest(method: string, path: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    method,
    path,
  };

  console.log(formatLog(entry));
}

export function logResponse(
  method: string,
  path: string,
  status: number,
  duration: number
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: status >= 400 ? 'error' : 'info',
    method,
    path,
    status,
    duration,
  };

  const log = status >= 400 ? console.error : console.log;
  log(formatLog(entry));
}

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
}
