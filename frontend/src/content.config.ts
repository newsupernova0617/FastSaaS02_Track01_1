import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      description: z.string(),
      excerpt: z.string(),
      category: z.enum([
        'money-basics',
        'life-stages',
        'saving-tips',
        'app-guides',
      ]),
      tags: z.array(z.string()).min(1),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      coverImage: image().optional(),
      ogImage: z.string().optional(),
      canonicalURL: z.string().url().optional(),
      readingTime: z.number().int().positive().optional(),
    }),
});

export const collections = { blog };
