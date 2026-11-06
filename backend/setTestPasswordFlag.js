
const adminApp = require("./firebaseAdmin");
const { getAuth } = require("firebase-admin/auth");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter your TEST account UID: ", async (uid) => {
  try {
    if (!uid.trim()) {
      throw new Error("UID cannot be empty.");
    }

   const auth = getAuth(adminApp);
    const user = await auth.getUser(uid.trim());

    if (user.email) {
      console.log("Test account:", user.email);
    } else {
      console.log("Test account found.");
    }

    const existingClaims = user.customClaims || {};

    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      mustChangePassword: true,
    });

    console.log("Flag enabled for this account only.");
    console.log("Sign out and sign back in to test the flow.");
  } catch (error) {
    console.error("Failed:", error.message);
  } finally {
    rl.close();
  }
});
