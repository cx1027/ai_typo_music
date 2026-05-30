"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { useState } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  if (user) {
    router.replace("/create");
    return null;
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="logo">MoodType</div>
      </header>

      <div className="hero">
        <div className="hero-logo">MoodType</div>
        <p className="hero-tagline">Turn your mood into music</p>

        <div className="card auth-card">
          <h2 className="card-title">
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
