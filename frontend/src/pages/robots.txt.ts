export function GET({ site }: { site?: URL }) {
  const origin = site?.toString() ?? 'https://fastsaas.pages.dev';
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('/sitemap.xml', origin).toString()}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
