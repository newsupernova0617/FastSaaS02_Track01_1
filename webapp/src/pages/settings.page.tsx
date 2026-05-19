/** @jsxImportSource hono/jsx */
import type { AppViewProps } from '../app-types';
import { SettingsScreen } from '../components/screens/SettingsScreen';
import type { PageModule } from './page-types';

export const route: PageModule['route'] = 'settings';
export const path = '/settings';
export const title = '설정';

export function component(props: AppViewProps) {
  return (
    <SettingsScreen
      profile={props.profile}
      session={props.session}
      onSignOut={props.onSignOut}
      onRequestNotificationPermission={props.onRequestNotificationPermission}
      quickEntrySubscribed={props.quickEntrySubscribed}
      quickEntrySupported={props.quickEntrySupported}
      quickEntryLoading={props.quickEntryLoading}
      quickEntryError={props.quickEntryError}
      onEnableQuickEntry={props.onEnableQuickEntry}
      onDisableQuickEntry={props.onDisableQuickEntry}
      onSendQuickEntryTest={props.onSendQuickEntryTest}
    />
  );
}
