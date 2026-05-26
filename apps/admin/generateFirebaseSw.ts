function generateFirebaseSw(firebaseConfig: Record<string, string>) {
  const json = JSON.stringify(firebaseConfig, null, 2);

  return `
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js",
);

const config = ${json};

firebase.initializeApp(config);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { notification, data } = payload;

  const title =
    notification?.title ?? data?.title ?? "Oshap";
  const body =
    notification?.body ?? data?.body ?? "";

  const options = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data?.tag ?? "oshap-notification",
    data,
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
`.trimStart();
}

export default generateFirebaseSw;
