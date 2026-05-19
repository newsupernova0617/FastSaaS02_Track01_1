/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { SearchScreen } from '../components/screens/SearchScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'search';
export const path = '/search';
export const title = 'AI 검색';

export function component(props: AppViewProps) {
  return <SearchScreen result={props.searchResult} onSubmitSearch={props.onSubmitSearch} />;
}
