import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';

const categoryLabels = {
  'money-basics': '돈 관리 기초',
  'life-stages': '상황별 가이드',
  'saving-tips': '절약 실전',
  'app-guides': '앱 비교',
} as const;

type BlogEntry = CollectionEntry<'blog'>;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number, maxLines: number) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const chars = Array.from(normalized);
  if (chars.length <= maxChars) return [normalized];

  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += maxChars) {
    const next = chars.slice(index, index + maxChars).join('').trim();
    if (next) {
      lines.push(next);
    }
  }

  if (chars.length > maxChars * maxLines && lines.length > 0) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, maxChars - 1))}…`;
  }

  return lines;
}

function renderLines(
  text: string,
  x: number,
  y: number,
  maxChars: number,
  maxLines: number,
  fontSize: number,
  lineHeight: number,
) {
  const lines = wrapText(text, maxChars, maxLines);
  return lines
    .map(
      (line, index) =>
        `<tspan x="${x}" y="${y + index * lineHeight}" font-size="${fontSize}">${escapeXml(line)}</tspan>`,
    )
    .join('');
}

export async function getStaticPaths() {
  const posts = await getCollection('blog');

  return posts
    .filter((post) => !post.data.draft)
    .map((post) => ({
      params: { slug: post.data.slug },
      props: { post },
    }));
}

export function GET({ props, site }: { props: { post: BlogEntry }; site?: URL }) {
  const { post } = props;
  const origin = site?.toString() ?? 'https://fastsaas.pages.dev';
  const categoryLabel = categoryLabels[post.data.category];
  const title = post.data.seoTitle ?? post.data.title;
  const description = post.data.excerpt || post.data.description;
  const readingTime = `${post.data.readingTime ?? 5} min read`;
  const titleLines = wrapText(title, 20, 2);
  const excerptLines = wrapText(description, 30, 2);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="84" y1="36" x2="1120" y2="596" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8FAFC" />
      <stop offset="0.56" stop-color="#EEF4FF" />
      <stop offset="1" stop-color="#E0ECFF" />
    </linearGradient>
    <linearGradient id="accent" x1="120" y1="120" x2="1080" y2="520" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563EB" />
      <stop offset="1" stop-color="#7C3AED" />
    </linearGradient>
    <filter id="shadow" x="0" y="0" width="1200" height="630" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#1E293B" flood-opacity="0.14" />
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="1036" cy="118" r="116" fill="#DBEAFE" />
  <circle cx="1086" cy="498" r="164" fill="#E9D5FF" />
  <circle cx="138" cy="528" r="150" fill="#C7D2FE" />
  <path d="M150 104C214 70 280 54 356 54H904C982 54 1046 80 1094 128V130H150V104Z" fill="url(#accent)" opacity="0.12" />

  <g filter="url(#shadow)">
    <rect x="84" y="72" width="1032" height="486" rx="40" fill="white" />
  </g>

  <rect x="122" y="110" width="132" height="40" rx="20" fill="#DBEAFE" />
  <text x="188" y="136" text-anchor="middle" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="18" font-weight="700" fill="#2563EB">${escapeXml(categoryLabel)}</text>

  <text x="122" y="200" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="22" font-weight="700" fill="#475569">${escapeXml(readingTime)}</text>

  <text x="122" y="270" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="58" font-weight="900" fill="#0F172A" letter-spacing="-1.4">
    ${renderLines(title, 122, 270, 18, 2, 58, 68)}
  </text>

  <text x="122" y="424" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="28" font-weight="500" fill="#475569" letter-spacing="-0.2">
    ${renderLines(description, 122, 424, 32, 2, 28, 40)}
  </text>

  <rect x="122" y="500" width="212" height="54" rx="27" fill="#2563EB" />
  <text x="228" y="534" text-anchor="middle" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="22" font-weight="800" fill="white">FastSaaS 블로그</text>

  <text x="1078" y="528" text-anchor="end" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="20" font-weight="700" fill="#64748B">가계부를 더 쉽게 관리하는 AI</text>
  <text x="1078" y="558" text-anchor="end" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="16" font-weight="500" fill="#94A3B8">${escapeXml(new URL(`/blog/${post.data.slug}/`, origin).toString())}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
