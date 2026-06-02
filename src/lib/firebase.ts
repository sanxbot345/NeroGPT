import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase safely
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "");

const activeConfig = isFirebaseConfigured 
  ? firebaseConfig 
  : {
      apiKey: "dummy-api-key-for-local-preview-only",
      authDomain: "dummy-project.firebaseapp.com",
      projectId: "dummy-project",
      storageBucket: "dummy-project.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abc123def",
      firestoreDatabaseId: "(default)"
    };

const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();

export const auth = getAuth(app);

// Use the database matching the firestoreDatabaseId key from config
export const db = getFirestore(app, activeConfig.firestoreDatabaseId || "(default)");

// Operations for customized error catching
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Login setup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error) {
    console.error("Gagal login dengan Google:", error);
    throw error;
  }
}

// Sync user profiles inside Firestore
export async function syncUserProfile(user: User) {
  const userDocRef = doc(db, "users", user.uid);
  try {
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        userId: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Pengguna neroGPT",
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function getUserConversationsFromServer(userId: string): Promise<any[]> {
  try {
    const colRef = collection(db, "users", userId, "conversations");
    const querySnapshot = await getDocs(colRef);
    const conversations: any[] = [];
    querySnapshot.forEach((docSnap) => {
      conversations.push(docSnap.data());
    });
    return conversations;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/conversations`);
    return [];
  }
}

export async function saveConversationToServer(userId: string, conversation: any) {
  try {
    const docRef = doc(db, "users", userId, "conversations", conversation.id);
    await setDoc(docRef, {
      id: conversation.id,
      title: conversation.title,
      personalityId: conversation.personalityId,
      messages: conversation.messages,
      createdAt: conversation.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/conversations/${conversation.id}`);
  }
}

export async function deleteConversationFromServer(userId: string, conversationId: string) {
  try {
    const docRef = doc(db, "users", userId, "conversations", conversationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/conversations/${conversationId}`);
  }
}
