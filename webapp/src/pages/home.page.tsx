/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { HomeScreen } from '../components/screens/HomeScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'home';
export const path = '/';
export const title = '대화로 기록';

export function component(props: AppViewProps) {
  return <HomeScreen result={props.homeResult} bootstrap={props.bootstrap} timeline={props.timeline} isAuthenticated={Boolean(props.session)} onSubmitComposer={props.onSubmitComposer} />;
}
