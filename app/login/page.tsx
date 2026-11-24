
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage({ initialRegister = false }: { initialRegister?: boolean }) {
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(initialRegister);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") router.replace("/register");
  }, [router]);

  // Parent details
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [contactDiffers, setContactDiffers] = useState(false);
  const [additionalContact, setAdditionalContact] = useState("");

  // Child details
  const [childName, setChildName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [currentClass, setCurrentClass] = useState("");

  // Login details
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setMessage("Passwords do not match. Please re-enter your confirmation password.");
        return;
      }

      if (
        !fullName.trim() ||
        !whatsappNumber.trim() ||
        !childName.trim() ||
        !dateOfBirth ||
        !currentClass.trim()
      ) {
        setMessage("Please complete all required fields.");
        return;
      }

      if (contactDiffers && !additionalContact.trim()) {
        setMessage("Please enter the additional contact number.");
        return;
      }

      // Prevent future date of birth.
      const today = new Date();
      const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      if (dateOfBirth > todayString) {
        setMessage("Date of birth cannot be in the future.");
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/login",
            data: {
              full_name: fullName.trim(),
              whatsapp_number: whatsappNumber.trim(),
              contact_number_differs: contactDiffers,
              additional_contact_number: contactDiffers
                ? additionalContact.trim()
                : "",
              child_name: childName.trim(),
              date_of_birth: dateOfBirth,
              current_class: currentClass.trim(),
            },
          },
        });

        if (error) throw error;

        // Clear the new session so the parent can sign in manually.
        if (data.session) {
          const { error: signOutError } =
            await supabase.auth.signOut();

          if (signOutError) {
            throw signOutError;
          }
        }

        // A null session means email confirmation may be required.
        setNeedsEmailConfirmation(!data.session);
        // Show the appropriate confirmation or registration status.
        setPassword("");
        setConfirmPassword("");
        setShowSuccessPopup(true);

      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
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

        if (roleData.role === "owner") {
          router.push("/owner/dashboard");
        } else if (roleData.role === "admin") {
          router.push("/admin/dashboard");
        } else if (roleData.role === "clinic_admin") {
          router.push("/clinic-admin/dashboard");
        } else if (roleData.role === "teacher") {
          const { data: activeTeacher, error: teacherError } = await supabase
            .from("teachers")
            .select("id")
            .eq("user_id", data.user.id)
            .eq("status", "active")
            .maybeSingle();
          if (teacherError || !activeTeacher) {
            await supabase.auth.signOut();
            throw new Error("Your teacher account is inactive. Please contact the clinic Admin or Super Admin.");
          }
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
            SWASTHA<span className="brand-light"> LEARNING CLINIC</span>
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
              ? "Join the Swastha Learning Clinic community."
              : "Sign in to continue your learning journey."}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <h3>Parent / Guardian details</h3>

                <label className="auth-label">
                  Parent / Guardian name *
                  <input
                    className="auth-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Enter parent or guardian name"
                  />
                </label>

                <label className="auth-label">
                  WhatsApp number *
                  <input
                    className="auth-input"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    required
                    autoComplete="tel"
                    placeholder="Enter WhatsApp number"
                  />
                </label>

                <label className="auth-label">
                  <input
                    type="checkbox"
                    checked={contactDiffers}
                    onChange={(e) => {
                      setContactDiffers(e.target.checked);
                      if (!e.target.checked) {
                        setAdditionalContact("");
                      }
                    }}
                  />
                  {" "}Contact number differs from WhatsApp number
                </label>

                {contactDiffers && (
                  <label className="auth-label">
                    Additional contact number *
                    <input
                      className="auth-input"
                      type="tel"
                      value={additionalContact}
                      onChange={(e) =>
                        setAdditionalContact(e.target.value)
                      }
                      required
                      placeholder="Enter additional contact number"
                    />
                  </label>
                )}

                <h3>Child details</h3>

                <label className="auth-label">
                  Child's name *
                  <input
                    className="auth-input"
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    required
                    placeholder="Enter child's full name"
                  />
                </label>

                <label className="auth-label">
                  Date of birth *
                  <input
                    className="auth-input"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </label>

                <label className="auth-label">
                  Current class *
                  <input
                    className="auth-input"
                    type="text"
                    value={currentClass}
                    onChange={(e) => setCurrentClass(e.target.value)}
                    required
                    placeholder="Example: Class 6, LKG, UKG"
                  />
                </label>

                <h3>Account details</h3>
              </>
            )}

            <label className="auth-label">
              Email address *
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
              Password *
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

            {isRegister && (
              <label className="auth-label">
                Confirm Password *
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  aria-invalid={confirmPassword.length > 0 && password !== confirmPassword}
                  aria-describedby="password-match-message"
                  placeholder="Re-enter your password"
                />
                <span
                  id="password-match-message"
                  role="status"
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: 12,
                    color: confirmPassword && password !== confirmPassword ? "#b42318" : "#176b58",
                  }}
                >
                  {confirmPassword
                    ? password === confirmPassword
                      ? "Passwords match ✓"
                      : "Passwords do not match"
                    : ""}
                </span>
              </label>
            )}

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
          {!isRegister && (
            <p style={{marginTop:10,fontSize:13,textAlign:"right"}}>
              <button type="button" style={{background:"none",border:0,color:"#176b58",cursor:"pointer",textDecoration:"underline"}} onClick={()=>router.push("/forgot-password")}>
                Forgot password?
              </button>
            </p>
          )}

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
                router.push(isRegister ? "/login" : "/register");
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

      {/* Registration Success Popup */}
      {showSuccessPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-success-title"
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "420px",
              padding: "32px 24px",
              borderRadius: "18px",
              textAlign: "center",
              boxShadow: "0 15px 50px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 18px",
                borderRadius: "50%",
                background: "#e7f5ed",
                color: "#176b58",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>

            <h2
              id="registration-success-title"
              style={{
                color: "#183a35",
                fontSize: "23px",
                margin: "0 0 12px",
              }}
            >
              {needsEmailConfirmation ? "Check your email" : "Registration Completed!"}
            </h2>

            <p
              style={{
                color: "#667a74",
                lineHeight: 1.6,
                margin: "0 0 24px",
              }}
            >
              {needsEmailConfirmation
                ? "Your registration request was received. Please check your email for a verification link before signing in. If you do not receive it, contact support@swasthalearning.com."
                : "Your account and child registration have been completed successfully. You can now sign in to your account."}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSuccessPopup(false);
                setMessage("");
                router.replace("/login");
              }}
              style={{
                background: "#176b58",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
