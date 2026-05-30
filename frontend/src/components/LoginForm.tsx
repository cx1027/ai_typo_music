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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess?.();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label className="field-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label className="field-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
            placeholder="Your password"
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {onSwitch && (
        <p className="switch-link">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="link-accent bg-transparent border-none cursor-pointer p-0 text-inherit"
          >
            Sign Up
          </button>
        </p>
      )}
    </div>
  );
}
