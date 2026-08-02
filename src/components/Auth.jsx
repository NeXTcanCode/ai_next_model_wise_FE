import React, { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../lib/api";

export default function Auth({ onLogin, errorMessage, setErrorMessage }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const submit = async () => {
    setErrorMessage("");
    try {
      const data = await api(
        register ? "/api/v1/auth/register" : "/api/v1/auth/login",
        { method: "POST", body: JSON.stringify(form) }
      );
      localStorage.setItem("modelwise_session", data.token);
      onLogin(data.user);
    } catch (error) {
      setErrorMessage(error.message);
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
        <span className="eyebrow">
          {register ? "CREATE YOUR WORKSPACE" : "WELCOME BACK"}
        </span>
        <h1>{register ? "Start choosing smarter." : "Welcome back."}</h1>
        <p>
          {register
            ? "Set up your personal model workspace in a minute."
            : "Sign in to see which model fits your next task."}
        </p>
        {register && (
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Alex Kim"
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
            type="password"
            placeholder="••••••••"
          />
        </label>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <button className="primary" onClick={submit}>
          {register ? "Create account" : "Continue"} <ArrowRight size={17} />
        </button>
        <small className="auth-foot">
          {register ? "Already have an account?" : "New to modelwise?"}{" "}
          <button onClick={() => setRegister(!register)}>
            {register ? "Sign in" : "Create an account"}
          </button>
        </small>
      </div>
      <span className="auth-note">
        Built by <a href="https://github.com/NeXTcanCode" target="_blank" rel="noreferrer">@NeXTcanCode</a>
        <span className="auth-note-badge">GitHub</span>
      </span>
    </div>
  );
}
