
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

type Activity = {
  id: string;
  assigned_at: string;
  due_date: string | null;
  status: string;
  learning_activities: {
    title: string;
    description: string | null;
  } | null;
};

export default function ParentDashboard() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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

      // Load parent profile
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

      // Load linked children
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

        // Load activities assigned to these children
        const { data: activityData, error: activityError } =
          await supabase
            .from("student_activity_assignments")
            .select(`
              id,
              assigned_at,
              due_date,
              status,
              learning_activities (
                title,
                description
              )
            `)
            .in("student_id", studentIds)
            .order("assigned_at", { ascending: false });

        if (activityError) {
          setLoadError("Unable to load learning activities.");
        } else {
          setActivities((activityData || []) as Activity[]);
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

  function formatDateTime(date: string) {
    return new Date(date).toLocaleDateString("en-IN");
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

          {students.length === 0 ? (
            <p>No child information was found for your account.</p>
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

        {/* Learning Activities */}
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
          <h2>Learning Activities</h2>

          {activities.length === 0 ? (
            <p>
              No learning activities have been assigned yet.
              Your teacher's assigned activities will appear here.
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  marginTop: 20,
                  padding: 20,
                  background: "#f8faf7",
                  border: "1px solid #dce8e1",
                  borderRadius: 12,
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {activity.learning_activities?.title ||
                    "Untitled activity"}
                </h3>

                <p>
                  {activity.learning_activities?.description ||
                    "No description provided."}
                </p>

                <p>
                  <strong>Assigned date:</strong>{" "}
                  {formatDateTime(activity.assigned_at)}
                </p>

                <p>
                  <strong>Due date:</strong>{" "}
                  {formatDate(activity.due_date)}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {activity.status === "completed"
                    ? "Completed"
                    : "Pending"}
                </p>
              </div>
            ))
          )}

          <p style={{ color: "#667a74", fontSize: 13 }}>
            Learning activities are displayed for viewing only.
          </p>
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
