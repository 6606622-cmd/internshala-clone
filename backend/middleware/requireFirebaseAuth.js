
const { getAuth } = require("firebase-admin/auth");
const adminApp = require("../firebaseAdmin");

const auth = getAuth(adminApp);

async function requireFirebaseAuth(req, res, next) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please sign in.",
    });
  }

  const idToken = authorization.slice(7).trim();

  if (!idToken || idToken.length > 10000) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken, true);

    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please sign in again.",
    });
  }
}

module.exports = requireFirebaseAuth;
