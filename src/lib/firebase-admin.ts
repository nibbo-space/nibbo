import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

function getPrivateKey() {
  const value = process.env.FIREBASE_PRIVATE_KEY;
  if (!value) return null;
  return value.replace(/\\n/g, "\n");
}

function ensureFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }
  return initializeApp({
    credential: applicationDefault(),
    projectId: projectId || undefined,
  });
}

export function getFirebaseAdminAuth() {
  const app = ensureFirebaseApp();
  return getAuth(app);
}

export function getFirebaseMessaging() {
  const app = ensureFirebaseApp();
  return getMessaging(app);
}
