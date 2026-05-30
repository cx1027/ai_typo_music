"use client";

import { useState } from "react";
import { useAuth } from "./auth/AuthProvider";

export function RegisterForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess?: () => void;
  onSwitch?: () => void;
}) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const result = await register(email, username, password);
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
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-base"
            placeholder="yourname"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
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
          <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base"
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-base"
            placeholder="Repeat your password"
            required
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn-primary w-full py-2.5 mt-1" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      {onSwitch && (
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="font-medium cursor-pointer bg-transparent border-none p-0"
            style={{ color: "var(--accent)" }}
          >
            Sign In
          </button>
        </p>
      )}
    </div>
  );
}
