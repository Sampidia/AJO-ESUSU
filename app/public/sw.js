self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.message,
            icon: data.icon || "/ajo_brand_logo.png",
            badge: data.badge || "/icons/badge-72x72.png",
            data: {
                url: data.url || "/"
            },
            // Add interactions
            vibrate: [100, 50, 100],
            actions: [
                { action: "open", title: "View Details" }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || "Ajo Notification", options)
        );
    } catch (e) {
        console.error("Error parsing push data:", e);
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // If a window is already open at this URL, focus it
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
