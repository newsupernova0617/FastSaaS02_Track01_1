/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { RecordScreen } from '../components/screens/RecordScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'record';
export const path = '/record';
export const title = '기록';

export function component(props: AppViewProps) {
  return <RecordScreen result={props.recordResult} onPreviousMonth={props.onPreviousRecordMonth} onNextMonth={props.onNextRecordMonth} onSubmit={props.onSubmitRecord} onDeleteTransaction={props.onDeleteTransaction} />;
}
