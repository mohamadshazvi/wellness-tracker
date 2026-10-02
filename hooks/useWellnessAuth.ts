"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { authErrorMessage } from "../lib/wellness";

export type WellnessUser = { email: string; uid: string; name: string; joinedAt: string | null };

export function useWellnessAuth(onIdentityChange: (uid: string | null) => void) {
  const [user, setUser] = useState<WellnessUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => {
    setAuthError(null);
    setUser(firebaseUser ? { email: firebaseUser.email || "", uid: firebaseUser.uid,
      name: firebaseUser.displayName || "", joinedAt: firebaseUser.metadata.creationTime ?? null } : null);
    onIdentityChange(firebaseUser?.uid ?? null);
  }), [onIdentityChange]);

  const login = async (email: string, password: string, mode: "signin" | "signup", name = "") => {
    setAuthError(null);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        try { await updateProfile(credential.user, { displayName: name.trim() }); }
        catch (error) { console.error("Account created, but name could not be saved:", error); }
        setUser({ email: credential.user.email || "", uid: credential.user.uid,
          name: name.trim(), joinedAt: credential.user.metadata.creationTime ?? null });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error, mode));
    }
  };

  const loginWithProvider = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error));
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) {
      setAuthError("Enter your email address first.");
      return false;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthError(null);
      return true;
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : "Could not send the reset email.");
      return false;
    }
  };

  const logout = () => signOut(auth);

  const changeName = async (name: string) => {
    if (!auth.currentUser || !name.trim()) return false;
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      setUser((current) => current ? { ...current, name: name.trim() } : current);
      return true;
    } catch { return false; }
  };

  return { user, authError, login, loginWithProvider, resetPassword, logout, changeName };
}
