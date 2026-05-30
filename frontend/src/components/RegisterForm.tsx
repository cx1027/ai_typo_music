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
    <div className="flex flex-col gap-4">
      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label className="field-label">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="field-input"
            placeholder="yourname"
            required
            autoComplete="username"
          />
        </div>
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
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label className="field-label">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field-input"
            placeholder="Repeat your password"
            required
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      {onSwitch && (
        <p className="switch-link">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="link-accent bg-transparent border-none cursor-pointer p-0 text-inherit"
          >
            Sign In
          </button>
        </p>
      )}
    </div>
  );
}
