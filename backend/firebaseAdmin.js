const { initializeApp, cert, getApps } = require("firebase-admin/app");
const fs = require("fs");
const path = require("path");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const localKeyPath = path.join(__dirname, "serviceAccountKey.json");

  if (!fs.existsSync(localKeyPath)) {
    throw new Error(
      "Firebase Admin credentials missing. Configure FIREBASE_SERVICE_ACCOUNT in environment variables."
    );
  }

  serviceAccount = require(localKeyPath);
}

const adminApp =
  getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApps()[0];

module.exports = adminApp;