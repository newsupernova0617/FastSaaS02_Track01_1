/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { MonthlyReportScreen } from '../components/screens/MonthlyReportScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'monthlyReport';
export const path = '/monthly-report';
export const title = '월간 리포트';

export function component(props: AppViewProps) {
  return (
    <MonthlyReportScreen
      result={props.monthlyReportResult}
      reports={props.reports}
      onPreviousMonth={props.onPreviousMonthlyReportMonth}
      onNextMonth={props.onNextMonthlyReportMonth}
      onGenerateMonthlyReport={props.onGenerateMonthlyReport}
      onGenerateWeeklyReport={props.onGenerateWeeklyReport}
    />
  );
}
