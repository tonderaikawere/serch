import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase";

export type AppRole = "guest" | "student" | "instructor" | "admin";

export type AppProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: AppRole;
  hub: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: AppProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (params: {
    email: string;
    password: string;
    displayName: string;
    role: Exclude<AppRole, "guest">;
    hub: string;
  }) => Promise<void>;
  completeOnboarding: (params: {
    role: Exclude<AppRole, "guest" | "admin">;
    hub: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isKawerifyTechAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return /@kawerifytech\.com$/i.test(email);
}

function isUncommonInstructorEmail(email: string | null | undefined) {
  if (!email) return false;
  return /@uncommon\.org$/i.test(email);
}

async function getFirestoreRole(uid: string): Promise<AppRole | null> {
  try {
    const adminDoc = await getDoc(doc(firestore, "admins", uid));
    if (adminDoc.exists()) return "admin";
  } catch {
    // Non-admin users may not have read access to /admins.
    // Treat that as "not an admin" instead of failing auth bootstrap.
  }

  const userDoc = await getDoc(doc(firestore, "users", uid));
  if (userDoc.exists()) {
    const role = userDoc.data()?.role;
    if (role === "student" || role === "instructor" || role === "admin") return role;
  }

  return null;
}

async function getFirestoreHub(uid: string): Promise<string | null> {
  try {
    const studentDoc = await getDoc(doc(firestore, "students", uid));
    if (studentDoc.exists()) return (studentDoc.data()?.hub as string | undefined) ?? null;
  } catch {
    // ignore
  }

  try {
    const instructorDoc = await getDoc(doc(firestore, "instructors", uid));
    if (instructorDoc.exists()) return (instructorDoc.data()?.hub as string | undefined) ?? null;
  } catch {
    // ignore
  }

  try {
    const userDoc = await getDoc(doc(firestore, "users", uid));
    if (userDoc.exists()) return (userDoc.data()?.hub as string | undefined) ?? null;
  } catch {
    // ignore
  }

  return null;
}

async function upsertBaseUserDoc(user: User, role: AppRole | null) {
  const throttleKey = `auth:lastUpsertUserDoc:${user.uid}`;
  try {
    const last = Number(localStorage.getItem(throttleKey) ?? "0");
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    if (Number.isFinite(last) && last > 0 && now - last < sixHours) {
      return;
    }
    localStorage.setItem(throttleKey, String(now));
  } catch {
    // ignore
  }

  await setDoc(
    doc(firestore, "users", user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      role: role ?? null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function upsertCanonicalRoleDoc(params: {
  user: User;
  role: Exclude<AppRole, "guest">;
  hub: string | null;
}) {
  const { user, role, hub } = params;

  if (role === "admin") {
    await setDoc(
      doc(firestore, "admins", user.uid),
      {
        uid: user.uid,
        email: user.email ?? null,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  if (!hub) return;

  await setDoc(
    doc(firestore, role === "student" ? "students" : "instructors", user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      hub,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function resolveRole(user: User): Promise<AppRole> {
  if (isKawerifyTechAdminEmail(user.email)) return "admin";
  if (isUncommonInstructorEmail(user.email)) return "instructor";
  const firestoreRole = await getFirestoreRole(user.uid);
  return firestoreRole ?? "student";
}

async function buildProfile(user: User): Promise<AppProfile> {
  try {
    const role = await resolveRole(user);
    await upsertBaseUserDoc(user, role);
    const hub = await getFirestoreHub(user.uid);

    return {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      role,
      hub,
    };
  } catch (e) {
    const errAny = e as unknown as { code?: string };
    const code = typeof errAny?.code === "string" ? errAny.code : null;
    if (code === "resource-exhausted") {
      const role: AppRole = isKawerifyTechAdminEmail(user.email)
        ? "admin"
        : isUncommonInstructorEmail(user.email)
          ? "instructor"
          : "student";

      return {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        role,
        hub: null,
      };
    }
    throw e;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setAuthError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextProfile = await buildProfile(nextUser);
        setProfile(nextProfile);
        setAuthError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setAuthError(msg);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const refreshProfile = async () => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return;
    setLoading(true);
    try {
      const nextProfile = await buildProfile(currentUser);
      setProfile(nextProfile);
      setAuthError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      authError,
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(firebaseAuth, provider);
      },
      signInWithApple: async () => {
        const provider = new OAuthProvider("apple.com");
        await signInWithPopup(firebaseAuth, provider);
      },
      signInWithEmail: async (email, password) => {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      },
      signUpWithEmail: async ({ email, password, displayName, role, hub }) => {
        const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(result.user, { displayName });

        const finalRole: AppRole = isKawerifyTechAdminEmail(result.user.email)
          ? "admin"
          : isUncommonInstructorEmail(result.user.email)
            ? "instructor"
            : role;

        await upsertBaseUserDoc(result.user, finalRole);

        await upsertCanonicalRoleDoc({ user: result.user, role: finalRole, hub });

        await setDoc(
          doc(firestore, "users", result.user.uid),
          {
            role: finalRole,
            hub,
          },
          { merge: true },
        );

        await refreshProfile();
      },
      completeOnboarding: async ({ role, hub }) => {
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) return;

        const finalRole: Exclude<AppRole, "guest"> = isKawerifyTechAdminEmail(currentUser.email)
          ? "admin"
          : isUncommonInstructorEmail(currentUser.email)
            ? "instructor"
            : role;

        await upsertBaseUserDoc(currentUser, finalRole);
        await upsertCanonicalRoleDoc({ user: currentUser, role: finalRole, hub });

        await setDoc(
          doc(firestore, "users", currentUser.uid),
          {
            role: finalRole,
            hub,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        await refreshProfile();
      },
      signOut: async () => {
        await signOut(firebaseAuth);
      },
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
