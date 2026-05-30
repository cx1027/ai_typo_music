"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";

export default function HomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const handleCreate = () => {
    router.push("/create");
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "700px",
          height: "500px",
          background:
            "radial-gradient(ellipse at center top, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0.06) 50%, transparent 75%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-7xl font-bold tracking-tight"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-caveat), cursive",
              textShadow:
                "0 0 60px rgba(168,85,247,0.5), 0 0 120px rgba(168,85,247,0.25)",
            }}
          >
            MoodType
          </h1>
          <p className="text-base" style={{ color: "var(--text-muted)" }}>
            Turn your mood into music
          </p>
        </div>

        {/* Auth card */}
        <div
          className="flex flex-col items-center gap-6 p-8 rounded-2xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            width: "100%",
            maxWidth: "360px",
          }}
        >
          <h2
            className="text-2xl font-semibold"
            style={{
              fontFamily: "var(--font-caveat), cursive",
              color: "var(--text-primary)",
            }}
          >
            {authMode === "login" ? "Welcome back" : "Join MoodType"}
          </h2>

          {authMode === "login" ? (
            <LoginForm
              onSuccess={() => router.push("/create")}
              onSwitch={() => setAuthMode("register")}
            />
          ) : (
            <RegisterForm
              onSuccess={() => setAuthMode("login")}
              onSwitch={() => setAuthMode("login")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
