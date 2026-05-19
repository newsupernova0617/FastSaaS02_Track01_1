/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { getQuickEntryRegistration } from './lib/quick-entry-store';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const QUICK_ENTRY_TITLE = '빠른 기록';
const QUICK_ENTRY_BODY = '오늘 커피 4500원처럼 바로 입력하세요';
const QUICK_ENTRY_ACTION = 'quick-entry-reply';

type QuickEntryAction = {
  action: string;
  title: string;
  type: 'text';
  placeholder?: string;
};

type QuickEntryNotificationOptions = NotificationOptions & {
  actions?: QuickEntryAction[];
  renotify?: boolean;
  requireInteraction?: boolean;
};

type QuickEntryNotificationEvent = NotificationEvent & {
  reply?: string;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function showQuickEntryNotification() {
  const registration = await getQuickEntryRegistration().catch(() => null);
  const hasInlineReply = Boolean(registration?.quickEntryToken);

  const options: QuickEntryNotificationOptions = {
    body: QUICK_ENTRY_BODY,
    tag: 'quick-entry',
    renotify: true,
    requireInteraction: true,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: {
      kind: 'quick-entry',
      fallbackUrl: `/?quickEntry=${encodeURIComponent(QUICK_ENTRY_BODY)}`,
    },
  };

  if (hasInlineReply) {
    options.actions = [
      {
        action: QUICK_ENTRY_ACTION,
        type: 'text',
        title: '바로 기록',
        placeholder: '오늘 커피 4500원',
      },
    ];
  }

  await self.registration.showNotification(QUICK_ENTRY_TITLE, options as NotificationOptions);
}

self.addEventListener('push', (event) => {
  event.waitUntil(showQuickEntryNotification());
});

self.addEventListener('notificationclick', (event) => {
  const notificationEvent = event as QuickEntryNotificationEvent;
  const reply = typeof notificationEvent.reply === 'string' ? notificationEvent.reply.trim() : '';
  const data = (event.notification.data ?? {}) as { fallbackUrl?: string };
  event.notification.close();

  if (reply) {
    event.waitUntil(
      (async () => {
        const registration = await getQuickEntryRegistration().catch(() => null);
        if (!registration?.quickEntryToken) {
          const url = new URL(data.fallbackUrl ?? '/', self.location.origin);
          await self.clients.openWindow(url.toString());
          return;
        }

        const response = await fetch('/api/app/push/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: registration.quickEntryToken,
            reply,
          }),
        });

        if (!response.ok) {
          const url = new URL(data.fallbackUrl ?? '/', self.location.origin);
          await self.clients.openWindow(url.toString());
          return;
        }
      })()
    );
    return;
  }

  event.waitUntil(
    (async () => {
      const url = new URL(data.fallbackUrl ?? '/', self.location.origin);
      const client = await self.clients.openWindow(url.toString());
      if (client) {
        await client.focus();
      }
    })()
  );
});
