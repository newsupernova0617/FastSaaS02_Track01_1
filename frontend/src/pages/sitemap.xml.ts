import { getCollection } from 'astro:content';

const staticPaths = ['/', '/blog/', '/privacy/', '/terms/'];

export async function GET({ site }: { site?: URL }) {
  const origin = site?.toString() ?? 'https://easyaibudget.com';
  const posts = await getCollection('blog');
  const publishedPosts = posts.filter((post) => !post.data.draft);

  const urls = [
    ...staticPaths.map((path) => ({
      loc: new URL(path, origin).toString(),
      lastmod: undefined as string | undefined,
      priority: path === '/' ? '1.0' : '0.7',
    })),
    ...publishedPosts.map((post) => ({
      loc: new URL(`/blog/${post.data.slug}/`, origin).toString(),
      lastmod: (post.data.updatedDate ?? post.data.publishDate).toISOString(),
      priority: '0.8',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>${url.lastmod ? `
    <lastmod>${url.lastmod}</lastmod>` : ''}
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
