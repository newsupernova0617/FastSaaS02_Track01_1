import type { AppViewProps } from '../app-types';
import type { PageModule } from '../pages/page-types';
import type { RouteName } from '../state/app-store';

const pageModules = import.meta.glob('../pages/*.page.tsx', { eager: true }) as Record<string, PageModule>;

export const pageEntries = Object.values(pageModules);

const pageByRoute = new Map(pageEntries.map((page) => [page.route, page] as const));

export function getPageByRoute(route: RouteName): PageModule {
  const page = pageByRoute.get(route) ?? pageByRoute.get('home');
  if (!page) {
    throw new Error('No page modules registered');
  }
  return page;
}

export type { AppViewProps };
