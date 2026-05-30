"use client";

import { useState } from "react";
import { useAuth } from "./auth/AuthProvider";

export function LoginForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess?: () => void;
  onSwitch?: () => void;
}) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess?.();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
            Username or Email
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="input-base"
            placeholder="you@example.com"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
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
        <button type="submit" className="btn-primary w-full py-2.5 mt-1" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {onSwitch && (
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="font-medium cursor-pointer bg-transparent border-none p-0"
            style={{ color: "var(--accent)" }}
          >
            Sign Up
          </button>
        </p>
      )}
    </div>
  );
}
