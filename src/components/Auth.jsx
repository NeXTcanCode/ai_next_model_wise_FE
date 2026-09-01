import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { api } from "../lib/api";

export default function Auth({ onLogin, errorMessage, setErrorMessage }) {
  const [register, setRegister] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const submit = async (event) => {
    event?.preventDefault();
    if (pending) return;
    setPending(true);
    setErrorMessage("");
    try {
      const data = await api(
        register ? "/api/v1/auth/register" : "/api/v1/auth/login",
        { method: "POST", body: JSON.stringify(form) }
      );
      onLogin(data.user, data.token);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <span className="brand-mark">
          <Sparkles size={17} />
        </span>{" "}
        modelwise
      </div>
      <div className="auth-card">
        <form onSubmit={submit}>
          <span className="eyebrow">
            {register ? "CREATE YOUR WORKSPACE" : "WELCOME BACK"}
          </span>
          <h1>Not Every Prompt Needs a Flagship Model.</h1>
          <p>Find the right AI model for every task.</p>
          {register && (
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="name"
              />
            </label>
          )}
          <label>
            Email
            <input
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              type="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          <button className="primary" type="submit" disabled={pending}>
            {pending
              ? register
                ? "Creating your account…"
                : "Signing you in…"
              : register
              ? "Create account"
              : "Continue"}{" "}
            <ArrowRight size={17} />
          </button>
          <small className="auth-foot">
            {register ? "Already have an account?" : "New to modelwise?"}{" "}
            <button
              type="button"
              onClick={() => {
                setRegister(!register);
                setForm((current) => ({ ...current, password: "" }));
              }}
              disabled={pending}
            >
              {pending
                ? register
                  ? "Creating account…"
                  : "Signing in…"
                : register
                ? "Sign in"
                : "Create an account"}
            </button>
          </small>
        </form>
      </div>
      <span className="auth-note">
        Built by{" "}
        <a
          // href="https://github.com/NeXTcanCode"
          href="https://www.linkedin.com/in/vikas-sinha-7171aa75/"
          target="_blank"
          rel="noreferrer"
        >
          {/* @NeXTcanCode */}
          Vikas Sinha
        </a>
        <span className="auth-note-badge">LinkedIn</span>
      </span>
    </div>
  );
}
