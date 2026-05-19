/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { HelpScreen } from '../components/screens/HelpScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'help';
export const path = '/help';
export const title = '도움말';

export function component(props: AppViewProps) {
  return <HelpScreen onGoSettings={() => props.onNavigate('settings')} />;
}
