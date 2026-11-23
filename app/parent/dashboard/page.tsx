
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  current_class: string | null;
  status: string;
};

type ParentProfile = {
  full_name: string | null;
  phone: string | null;
  contact_number_differs: boolean;
  additional_contact_number: string | null;
};

export default function ParentDashboard() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function checkUser() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      const user = data.session.user;

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || !roleData) {
        router.replace("/login");
        return;
      }

      if (
        roleData.role !== "parent" &&
        roleData.role !== "student"
      ) {
        if (roleData.role === "admin") {
          router.replace("/admin/dashboard");
        } else if (roleData.role === "teacher") {
          router.replace("/teacher/dashboard");
        } else {
          router.replace("/login");
        }
        return;
      }

      setName(
        user.user_metadata?.full_name || user.email || "Learner"
      );
      setEmail(user.email || "");

      // Load parent profile.
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "full_name, phone, contact_number_differs, additional_contact_number"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        setLoadError("Unable to load your profile information.");
      } else {
        setProfile(profileData);
      }

      // Load linked children.
      const { data: links, error: linksError } = await supabase
        .from("parent_student_links")
        .select("student_id")
        .eq("parent_user_id", user.id);

      if (linksError) {
        setLoadError("Unable to load your child information.");
        setLoading(false);
        return;
      }

      const studentIds = (links || []).map(
        (link) => link.student_id
      );

      if (studentIds.length > 0) {
        const { data: studentData, error: studentError } =
          await supabase
            .from("students")
            .select(
              "id, full_name, date_of_birth, current_class, status"
            )
            .in("id", studentIds);

        if (studentError) {
          setLoadError("Unable to load your child information.");
        } else {
          setStudents(studentData || []);
        }
      }

      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function handleLogout() {
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace("/login");
  }

  function formatDate(date: string | null) {
    if (!date) return "Not available";

    const parts = date.split("-");

    if (parts.length !== 3) return date;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  if (loading) {
    return (
      <main style={{ padding: 40 }}>
        Loading your dashboard...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8faf7",
        color: "#183a35",
      }}
    >
      <header
        style={{
          padding: "20px 6%",
          background: "#ffffff",
          borderBottom: "1px solid #dce8e1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <strong>SWASTHA LEARNING CLINIC</strong>

        <button onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <section style={{ padding: "48px 6%" }}>
        <p>LEARN • GROW • THRIVE</p>

        <h1>Welcome, {name}!</h1>

        <p>
          Welcome to your Swastha Learning Clinic learning portal.
        </p>

        {/* My Profile */}
        <div
          style={{
            marginTop: 32,
            padding: 28,
            background: "#ffffff",
            border: "1px solid #dce8e1",
            borderRadius: 16,
            maxWidth: 750,
          }}
        >
          <h2>My Profile</h2>

          {profile ? (
            <>
              <p>
                <strong>Parent / Guardian name:</strong>{" "}
                {profile.full_name || "Not available"}
              </p>

              <p>
                <strong>WhatsApp number:</strong>{" "}
                {profile.phone || "Not available"}
              </p>

              <p>
                <strong>Contact number differs:</strong>{" "}
                {profile.contact_number_differs ? "Yes" : "No"}
              </p>

              {profile.contact_number_differs && (
                <p>
                  <strong>Additional contact number:</strong>{" "}
                  {profile.additional_contact_number || "Not available"}
                </p>
              )}

              <p>
                <strong>Login email:</strong>{" "}
                {email || "Not available"}
              </p>
            </>
          ) : (
            <p>Profile information is not available.</p>
          )}

          <p style={{ color: "#667a74", fontSize: 13 }}>
            Your profile information is currently read-only.
          </p>
        </div>

        {/* My Child */}
        <div
          style={{
            marginTop: 24,
            padding: 28,
            background: "#ffffff",
            border: "1px solid #dce8e1",
            borderRadius: 16,
            maxWidth: 750,
          }}
        >
          <h2>My Child</h2>

          {loadError ? (
            <p style={{ color: "#b42318" }}>{loadError}</p>
          ) : students.length === 0 ? (
            <p>
              No child information was found for your account.
              Please contact the clinic administrator.
            </p>
          ) : (
            students.map((student) => (
              <div
                key={student.id}
                style={{
                  marginTop: 20,
                  padding: 20,
                  background: "#f8faf7",
                  border: "1px solid #dce8e1",
                  borderRadius: 12,
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {student.full_name}
                </h3>

                <p>
                  <strong>Date of birth:</strong>{" "}
                  {formatDate(student.date_of_birth)}
                </p>

                <p>
                  <strong>Current class:</strong>{" "}
                  {student.current_class || "Not available"}
                </p>

                <p>
                  <strong>Registration status:</strong>{" "}
                  {student.status}
                </p>
              </div>
            ))
          )}
        </div>

        {loadError && (
          <p style={{ color: "#b42318", marginTop: 16 }}>
            {loadError}
          </p>
        )}
      </section>
    </main>
  );
}
