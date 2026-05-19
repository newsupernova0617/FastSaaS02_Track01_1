/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { ReportScreen } from '../components/screens/ReportScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'reports';
export const path = '/reports';
export const title = '월별 리포트';

export function component(props: AppViewProps) {
  return (
    <ReportScreen
      result={props.reportResult}
      reports={props.reports}
      selectedReport={props.selectedReport}
      selectedReportLoading={props.selectedReportLoading}
      selectedReportError={props.selectedReportError}
      onSelectReport={props.onSelectReport}
      onDeleteReport={props.onDeleteReport}
      onRenameReport={props.onRenameReport}
    />
  );
}
