"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (!authData.session) {
        setError("Login failed");
        setIsLoading(false);
        return;
      }

      setUser({
        id: authData.user.id,
        email: authData.user.email ?? "",
        username: authData.user.user_metadata?.username as string | undefined,
        avatar_url: authData.user.user_metadata?.avatar_url as string | undefined,
      });

      try {
        await loginUser(email, password);
      } catch {
        // Backend may fail if local DB user doesn't exist yet — not fatal
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "600px",
          height: "400px",
          background: "radial-gradient(ellipse at center top, rgba(168,85,247,0.25) 0%, rgba(168,85,247,0.05) 50%, transparent 80%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-6xl font-bold tracking-tight"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-caveat), cursive",
              textShadow: "0 0 40px rgba(168,85,247,0.4), 0 0 80px rgba(168,85,247,0.2)",
            }}
          >
            MoodType
          </h1>
          <p className="text-base" style={{ color: "var(--text-muted)" }}>
            Turn your mood into music
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full flex flex-col gap-5 p-8 rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {error && (
            <div
              className="p-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="Your password"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 mt-1"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-3 transition-colors cursor-pointer"
            style={{
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Sign up link */}
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium transition-colors" style={{ color: "var(--accent)" }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
