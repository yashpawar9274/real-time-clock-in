import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID;
const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY;

export type PushRegistrationResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" };

export async function registerForAdminPush(): Promise<PushRegistrationResult> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !firebaseConfig.messagingSenderId || !vapidKey) {
    return { status: "not-configured" };
  }
  if (!("Notification" in window) || !(await isSupported())) {
    return { status: "unsupported" };
  }
  if (window.top !== window.self) {
    return { status: "open-in-new-tab" };
  }

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const query = new URLSearchParams(firebaseConfig).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration });
  return token ? { status: "registered", token } : { status: "denied" };
}
