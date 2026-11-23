
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push("/parent/dashboard");
        } else {
          setMessage("Registration successful. Please check your email to confirm your account.");
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;

        const { data: roleData, error: roleError } =
          await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .single();

        if (roleError) throw roleError;

        if (roleData.role === "admin") {
          router.push("/admin/dashboard");
        } else if (roleData.role === "teacher") {
          router.push("/teacher/dashboard");
        } else if (
          roleData.role === "parent" ||
          roleData.role === "student"
        ) {
          router.push("/parent/dashboard");
        } else {
          throw new Error("Your account has no valid portal role.");
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="/">
          <span className="brand-mark">S</span>
          <span>
            SWASTHA<span className="brand-light"> LEARNING</span>
          </span>
        </a>
        <span className="nav-tag">SECURE ACCESS</span>
      </nav>

      <section className="auth-section">
        <div className="auth-card">
          <div className="eyebrow">
            A SUPPORTIVE SPACE TO GROW
          </div>

          <h1 className="auth-title">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>

          <p className="auth-description">
            {isRegister
              ? "Join the Swastha Learning community."
              : "Sign in to continue your learning journey."}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <label className="auth-label">
                Full name
                <input
                  className="auth-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
            )}

            <label className="auth-label">
              Email address
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={
                  isRegister ? "new-password" : "current-password"
                }
              />
            </label>

            <button
              className="auth-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <p className="auth-switch">
            {isRegister
              ? "Already have an account? "
              : "New to Swastha? "}

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setMessage("");
              }}
            >
              {isRegister ? "Sign in" : "Create account"}
            </button>
          </p>

          <a className="auth-home" href="/">
            ← Back to homepage
          </a>
        </div>
      </section>
    </main>
  );
}
