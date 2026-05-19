import type { AppViewProps } from '../app-types';
import type { RouteName } from '../state/app-store';

export type PageModule = {
  route: RouteName;
  path: string;
  title: string;
  component: (props: AppViewProps) => unknown;
};
