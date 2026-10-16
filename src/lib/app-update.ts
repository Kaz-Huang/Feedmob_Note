export const BEFORE_APP_REFRESH = 'minework:before-refresh';
export type AppRefreshDetail = { reason?: string };

export function prepareAppRefresh() {
  const event = new CustomEvent<AppRefreshDetail>(BEFORE_APP_REFRESH, { cancelable: true, detail: {} });
  return { allowed: window.dispatchEvent(event), reason: event.detail.reason };
}
