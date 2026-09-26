"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { authErrorMessage } from "../lib/wellness";

export type WellnessUser = { email: string; uid: string };

export function useWellnessAuth(onIdentityChange: (uid: string | null) => void) {
  const [user, setUser] = useState<WellnessUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => {
    setAuthError(null);
    setUser(firebaseUser ? { email: firebaseUser.email || "", uid: firebaseUser.uid } : null);
    onIdentityChange(firebaseUser?.uid ?? null);
  }), [onIdentityChange]);

  const login = async (email: string, password: string, mode: "signin" | "signup") => {
    setAuthError(null);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error, mode));
    }
  };

  const loginWithProvider = async (providerName: "google" | "facebook" | "apple") => {
    setAuthError(null);
    const provider = providerName === "google"
      ? new GoogleAuthProvider()
      : providerName === "facebook"
        ? new FacebookAuthProvider()
        : new OAuthProvider("apple.com");
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

  return { user, authError, login, loginWithProvider, resetPassword, logout };
}
