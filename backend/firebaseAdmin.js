const { initializeApp, cert, getApps } = require("firebase-admin/app");

const serviceAccount = require("./serviceAccountKey.json");

const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

module.exports = adminApp;