/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { CalendarScreen } from '../components/screens/CalendarScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'calendar';
export const path = '/calendar';
export const title = '달력';

export function component(props: AppViewProps) {
  return <CalendarScreen result={props.calendarResult} onPreviousMonth={props.onPreviousCalendarMonth} onNextMonth={props.onNextCalendarMonth} onSelectDate={props.onSelectCalendarDate} />;
}
