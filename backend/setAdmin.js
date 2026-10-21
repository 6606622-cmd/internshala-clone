
const { getAuth } = require("firebase-admin/auth");
const adminApp = require("./firebaseAdmin");
const serviceAccount = require("./serviceAccountKey.json");

async function setAdmin() {
  console.log("Service account project:", serviceAccount.project_id);
  console.log("Admin app project:", adminApp.options.projectId);

  const uid = "KCZkOz2PsFWc6HjCGj4mK1pf1QH3";
  const auth = getAuth(adminApp);

  const user = await auth.getUser(uid);

  await auth.setCustomUserClaims(uid, {
    ...user.customClaims,
    admin: true,
  });

  console.log("Admin permission assigned successfully.");
}

setAdmin().catch(console.error);
