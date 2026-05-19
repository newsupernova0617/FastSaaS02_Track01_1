/** @jsxImportSource hono/jsx */
import { type AppViewProps } from './app-types';
import { AppShell } from './components/AppShell';
import { getPageByRoute } from './lib/page-registry';
import { appStore } from './state/app-store';

export function App(props: AppViewProps) {
  const route = appStore.getState().route;
  const currentPage = getPageByRoute(route);
  const page = currentPage.component(props);

  return <AppShell {...props} route={route} pageTitle={currentPage.title} page={page} />;
}
