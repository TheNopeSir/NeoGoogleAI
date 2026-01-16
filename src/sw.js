import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

// Handle Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'https://ui-avatars.com/api/?name=NA&background=4ade80&color=000&size=192&font-size=0.5', // Default icon
      badge: 'https://ui-avatars.com/api/?name=NA&background=000&color=fff&size=96&font-size=0.5', // Small monochrome icon
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        id: data.id
      },
      actions: [
        { action: 'open', title: 'Открыть' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'NeoArchive', options)
    );
  } catch (e) {
    console.error('Push error:', e);
  }
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
