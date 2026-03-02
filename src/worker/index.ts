// Custom Service Worker for Push Notifications
self.addEventListener("push", (event: any) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: "/icon-192x192.png",
            badge: "/icon-192x192.png",
            data: {
                url: data.url || "/",
            },
        };

        event.waitUntil(self.registration.showNotification(data.title, options));
    }
});

self.addEventListener("notificationclick", (event: any) => {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow(event.notification.data.url)
    );
});
