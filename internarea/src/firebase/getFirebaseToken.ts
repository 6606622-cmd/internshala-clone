
import { auth } from "./firebase";

export async function getFirebaseToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to InternArea first.");
  }

  return user.getIdToken();
}
