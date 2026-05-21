const DIRECT_AI_ROUTE_PATTERNS: Array<{ method: string; pattern: RegExp }> = [
  { method: 'POST', pattern: /^\/api\/ai\/action$/ },
  { method: 'POST', pattern: /^\/api\/sessions\/\d+\/messages$/ },
  { method: 'POST', pattern: /^\/api\/app\/chat$/ },
  { method: 'POST', pattern: /^\/api\/app\/push\/reply$/ },
  { method: 'GET', pattern: /^\/api\/reports\/current$/ },
  { method: 'POST', pattern: /^\/api\/reports\/generate$/ },
  { method: 'GET', pattern: /^\/api\/app\/reports\/current$/ },
  { method: 'POST', pattern: /^\/api\/app\/reports\/generate$/ },
];

const RAG_ROUTE_PATTERNS: Array<{ method: string; pattern: RegExp }> = [
  { method: 'POST', pattern: /^\/api\/rag\/embed$/ },
  { method: 'POST', pattern: /^\/api\/rag\/search$/ },
];

function matchesRoute(method: string, pathname: string): boolean {
  return DIRECT_AI_ROUTE_PATTERNS.some((route) => route.method === method && route.pattern.test(pathname));
}

export function isDirectAiRoute(request: Request): boolean {
  if (request.method === 'OPTIONS') {
    return false;
  }

  const url = new URL(request.url);
  return matchesRoute(request.method.toUpperCase(), url.pathname);
}

export function isRagRoute(request: Request): boolean {
  if (request.method === 'OPTIONS') {
    return false;
  }

  const url = new URL(request.url);
  return RAG_ROUTE_PATTERNS.some((route) => route.method === request.method.toUpperCase() && route.pattern.test(url.pathname));
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export async function proxyDirectAiRequest(request: Request, aiApiBaseUrl: string): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = `${normalizeBaseUrl(aiApiBaseUrl)}${url.pathname}${url.search}`;
  const proxiedRequest = new Request(targetUrl, request);
  return fetch(proxiedRequest);
}
