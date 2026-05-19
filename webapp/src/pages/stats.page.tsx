/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { StatsScreen } from '../components/screens/StatsScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'stats';
export const path = '/stats';
export const title = '통계';

export function component(props: AppViewProps) {
  return <StatsScreen result={props.statsResult} reports={props.reports} onPreviousMonth={props.onPreviousStatsMonth} onNextMonth={props.onNextStatsMonth} />;
}
