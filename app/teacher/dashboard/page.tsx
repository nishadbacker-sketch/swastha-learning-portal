
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: string;
  full_name: string;
  current_class: string | null;
  date_of_birth: string | null;
  student_code: string | null;
  preferred_language: string | null;
  status: string;
};

type Guardian = {
  student_id: string;
  parent_user_id: string;
  guardian_name: string | null;
  whatsapp_number: string | null;
  additional_contact_number: string | null;
  contact_number_differs: boolean | null;
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
};

type ActivityAssignment = {
  id: string;
  student_id: string;
  activity_id: string;
  status: string;
  due_date: string | null;
  assigned_at: string;
};

type Level = "LP" | "UP" | "HS" | "HSS";

type Assessment = {
  id: string;
  student_id: string;
  assessment_level: Level;
  status: string;
  due_date: string | null;
  assigned_at: string;
};

const LEVELS: { value: Level; label: string }[] = [
  { value: "LP", label: "LP — Classes 1–4" },
  { value: "UP", label: "UP — Classes 5–7" },
  { value: "HS", label: "HS — Classes 8–10" },
  { value: "HSS", label: "HSS — Classes 11–12" },
];

const roman: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4,
  V: 5, VI: 6, VII: 7, VIII: 8,
  IX: 9, X: 10, XI: 11, XII: 12,
};

function getLevel(value: string | null): Level | null {
  if (!value) return null;

  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/^(CLASS|GRADE|STD|STANDARD)\s*[-:]?\s*/, "");

  const number = /^\d{1,2}$/.test(cleaned)
    ? Number(cleaned)
    : roman[cleaned];

  if (!number || number < 1 || number > 12) return null;
  if (number <= 4) return "LP";
  if (number <= 7) return "UP";
  if (number <= 10) return "HS";
  return "HSS";
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const parts = value.slice(0, 10).split("-");
  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : value;
}

const card: React.CSSProperties = {
  background: "#fff",
  padding: 24,
  borderRadius: 16,
  border: "1px solid #dce8e1",
  marginBottom: 22,
};

const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  marginTop: 8,
  marginBottom: 18,
  border: "1px solid #dce8e1",
  borderRadius: 8,
  fontSize: 15,
  background: "#fff",
  color: "#183a35",
};

const button: React.CSSProperties = {
  background: "#176b58",
  color: "#fff",
  padding: "12px 20px",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{ ...card, marginBottom: 0, borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 13, color: "#667a74" }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const colors: Record<string, string> = {
    assigned: "#2563eb",
    in_progress: "#d97706",
    submitted: "#7c3aed",
    reviewed: "#16805d",
    pending: "#d97706",
    completed: "#16805d",
  };

  return (
    <span
      style={{
        display: "inline-block",
        background: colors[value] || "#64748b",
        color: "#fff",
        borderRadius: 20,
        padding: "5px 11px",
        fontSize: 12,
      }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [profileId, setProfileId] = useState("");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityAssignments, setActivityAssignments] =
    useState<ActivityAssignment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const [level, setLevel] = useState<Level>("LP");
  const [assessmentStudent, setAssessmentStudent] = useState("");
  const [assessmentDue, setAssessmentDue] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityStudent, setActivityStudent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [activityDue, setActivityDue] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard(uid: string) {
    if (!supabase) return;

    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id, status")
      .eq("user_id", uid)
      .single();

    if (teacherError || !teacher || teacher.status !== "active") {
      throw new Error("Your teacher account is not active.");
    }

    const { data: links, error: linksError } = await supabase
      .from("teacher_assignments")
      .select("student_id")
      .eq("teacher_id", teacher.id);

    if (linksError) throw linksError;

    const ids = [...new Set((links || []).map((x) => x.student_id))];

    if (ids.length) {
      const [
        studentResult,
        guardianResult,
        activityAssignmentResult,
        assessmentResult,
      ] = await Promise.all([
        supabase
          .from("students")
          .select(
            "id, full_name, current_class, date_of_birth, student_code, preferred_language, status"
          )
          .in("id", ids),
        supabase.rpc("get_assigned_student_guardians"),
        supabase
          .from("student_activity_assignments")
          .select("id, student_id, activity_id, status, due_date, assigned_at")
          .in("student_id", ids)
          .eq("assigned_by", uid)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("assessment_assignments")
          .select("id, student_id, assessment_level, status, due_date, assigned_at")
          .in("student_id", ids)
          .order("assigned_at", { ascending: false }),
      ]);

      if (studentResult.error) throw studentResult.error;
      if (guardianResult.error) throw guardianResult.error;
      if (activityAssignmentResult.error) throw activityAssignmentResult.error;
      if (assessmentResult.error) throw assessmentResult.error;

      setStudents(studentResult.data || []);
      setGuardians(
        ((guardianResult.data || []) as Guardian[]).filter(
          (g) => ids.includes(g.student_id)
        )
      );
      setActivityAssignments(activityAssignmentResult.data || []);
      setAssessments((assessmentResult.data || []) as Assessment[]);
    } else {
      setStudents([]);
      setGuardians([]);
      setActivityAssignments([]);
      setAssessments([]);
      setProfileId("");
    }

    const { data: activityData, error: activityError } = await supabase
      .from("learning_activities")
      .select("id, title, description")
      .eq("created_by", uid)
      .order("created_at", { ascending: false });

    if (activityError) throw activityError;
    setActivities(activityData || []);
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      try {
        const { data, error } = await supabase.auth.getUser();

        if (cancelled) return;
        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const user = data.user;

        const { data: role, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (cancelled) return;
        if (roleError || !role) {
          router.replace("/login");
          return;
        }

        if (role.role !== "teacher") {
          router.replace(
            role.role === "admin"
              ? "/admin/dashboard"
              : role.role === "parent"
              ? "/parent/dashboard"
              : "/login"
          );
          return;
        }

        setUserId(user.id);
        setTeacherName(
          user.user_metadata?.full_name || user.email || "Teacher"
        );

        await loadDashboard(user.id);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Unable to load dashboard."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId || !title.trim() || saving) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase.from("learning_activities").insert({
        title: title.trim(),
        description: description.trim() || null,
        created_by: userId,
      });

      if (error) throw error;

      setTitle("");
      setDescription("");
      setMessage("Learning activity created successfully.");
      await loadDashboard(userId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to create activity."
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !supabase ||
      !userId ||
      !activityStudent ||
      !selectedActivity ||
      saving
    ) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("student_activity_assignments")
        .insert({
          student_id: activityStudent,
          activity_id: selectedActivity,
          assigned_by: userId,
          due_date: activityDue || null,
          status: "pending",
        });

      if (error) throw error;

      setActivityStudent("");
      setSelectedActivity("");
      setActivityDue("");
      setMessage("Learning activity assigned successfully.");
      await loadDashboard(userId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to assign activity."
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignAssessment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId || !assessmentStudent || saving) return;

    const student = students.find((s) => s.id === assessmentStudent);

    if (!student || getLevel(student.current_class) !== level) {
      setErrorMessage("Student class does not match the assessment level.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("assessment_assignments")
        .insert({
          student_id: assessmentStudent,
          assessment_level: level,
          assigned_by: userId,
          due_date: assessmentDue || null,
          status: "assigned",
        });

      if (error) throw error;

      setAssessmentStudent("");
      setAssessmentDue("");
      setMessage("Assessment assigned successfully.");
      await loadDashboard(userId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to assign assessment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function studentName(id: string) {
    return students.find((s) => s.id === id)?.full_name || "Unknown student";
  }

  function activityTitle(id: string) {
    return activities.find((a) => a.id === id)?.title || "Activity";
  }

  const profile = students.find((s) => s.id === profileId);
  const profileGuardians = guardians.filter(
    (g) => g.student_id === profileId
  );

  const eligible = students.filter(
    (s) => getLevel(s.current_class) === level
  );

  const statuses = [
    { key: "assigned", label: "Assigned", color: "#2563eb" },
    { key: "in_progress", label: "In progress", color: "#d97706" },
    { key: "submitted", label: "Submitted", color: "#7c3aed" },
    { key: "reviewed", label: "Reviewed", color: "#16805d" },
  ];

  if (loading) {
    return <main style={{ padding: 40 }}>Loading Teacher Dashboard...</main>;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8faf7",
        color: "#183a35",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #dce8e1",
          padding: "20px 6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <strong>SWASTHA LEARNING CLINIC</strong>
        <button style={button} onClick={signOut}>Sign out</button>
      </header>

      <section
        style={{
          maxWidth: 1120,
          margin: "auto",
          padding: "35px 20px 70px",
        }}
      >
        <p style={{ color: "#176b58", fontWeight: 700 }}>
          LEARN • GROW • THRIVE
        </p>
        <h1>Teacher Dashboard</h1>
        <p>Welcome, {teacherName}!</p>
        <p>Manage students, assessments, learning activities and progress.</p>

        {message && (
          <p
            role="status"
            style={{
              background: "#e4f5ea",
              padding: 14,
              borderRadius: 8,
              color: "#176b42",
            }}
          >
            {message}
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            style={{
              background: "#fff0ed",
              padding: 14,
              borderRadius: 8,
              color: "#b42318",
            }}
          >
            {errorMessage}
          </p>
        )}

        <h2>Dashboard Overview</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 25,
          }}
        >
          <Metric label="Assigned Students" value={students.length} color="#176b58" />
          <Metric label="Learning Activities" value={activities.length} color="#2563eb" />
          <Metric label="Assessments" value={assessments.length} color="#7c3aed" />
          <Metric
            label="Pending Reviews"
            value={assessments.filter((a) => a.status === "submitted").length}
            color="#d97706"
          />
        </div>

        <div style={card}>
          <h2>Student Profile & Guardian Contact Details</h2>
          <p>Select an assigned student to view their details.</p>

          <label htmlFor="profile-student">Select student</label>
          <select
            id="profile-student"
            style={input}
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          >
            <option value="">Choose a student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} — {s.current_class || "Class not set"}
              </option>
            ))}
          </select>

          {profile && (
            <div>
              <h3>{profile.full_name}</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                  background: "#f2f8f4",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div><strong>Student code</strong><p>{profile.student_code || "Not available"}</p></div>
                <div><strong>Date of birth</strong><p>{formatDate(profile.date_of_birth)}</p></div>
                <div><strong>Current class</strong><p>{profile.current_class || "Not available"}</p></div>
                <div><strong>Assessment level</strong><p>{getLevel(profile.current_class) || "Not available"}</p></div>
                <div><strong>Preferred language</strong><p>{profile.preferred_language || "Not available"}</p></div>
                <div><strong>Status</strong><p>{profile.status}</p></div>
              </div>

              <h3 style={{ marginTop: 24 }}>Parent / Guardian Details</h3>

              {profileGuardians.length === 0 ? (
                <p>No linked guardian details available for this student.</p>
              ) : (
                profileGuardians.map((g) => (
                  <div
                    key={g.parent_user_id}
                    style={{
                      border: "1px solid #dce8e1",
                      borderRadius: 12,
                      padding: 18,
                      marginBottom: 12,
                    }}
                  >
                    <p><strong>Guardian:</strong> {g.guardian_name || "Not available"}</p>
                    <p>
                      <strong>WhatsApp:</strong>{" "}
                      {g.whatsapp_number ? (
                        <a href={`tel:${g.whatsapp_number}`}>
                          {g.whatsapp_number}
                        </a>
                      ) : "Not available"}
                    </p>
                    <p>
                      <strong>Additional contact:</strong>{" "}
                      {g.additional_contact_number || "Not provided"}
                    </p>
                    <p>
                      <strong>Separate contact number:</strong>{" "}
                      {g.contact_number_differs ? "Yes" : "No"}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={card}>
          <h2>My Assigned Students</h2>
          {students.length === 0 ? (
            <p>No students assigned yet.</p>
          ) : (
            students.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #dce8e1",
                }}
              >
                <strong>{s.full_name}</strong>
                <p>Class: {s.current_class || "Not available"}</p>
                <p>Assessment level: {getLevel(s.current_class) || "Unknown"}</p>
                <Status value={s.status} />
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    style={button}
                    onClick={() => {
                      setProfileId(s.id);
                      document.getElementById("profile-student")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                  >
                    View Student Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h2>Assessment Analytics</h2>
          <p>Counts are based on assessment assignments, not private scores.</p>

          {statuses.map((s) => {
            const count = assessments.filter((a) => a.status === s.key).length;
            const percentage = assessments.length
              ? (count / assessments.length) * 100
              : 0;

            return (
              <div key={s.key} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{s.label}</strong>
                  <span>{count}</span>
                </div>
                <div
                  style={{
                    background: "#e9efeb",
                    borderRadius: 20,
                    height: 14,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: s.color,
                      width: `${percentage}%`,
                      height: "100%",
                    }}
                  />
                </div>
              </div>
            );
          })}

          <h3>Students by Grade Level</h3>
          {LEVELS.map((l) => (
            <p key={l.value}>
              <strong>{l.value}:</strong>{" "}
              {students.filter((s) => getLevel(s.current_class) === l.value).length}
            </p>
          ))}
        </div>

        <div style={card}>
          <h2>Assign Grade-Based Assessment</h2>
          <form onSubmit={assignAssessment}>
            <label htmlFor="level">Assessment level *</label>
            <select
              id="level"
              style={input}
              value={level}
              onChange={(e) => {
                setLevel(e.target.value as Level);
                setAssessmentStudent("");
              }}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>

            <label htmlFor="assessment-student">Select student *</label>
            <select
              id="assessment-student"
              style={input}
              value={assessmentStudent}
              onChange={(e) => setAssessmentStudent(e.target.value)}
              required
            >
              <option value="">Choose a student</option>
              {eligible.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} — {s.current_class}
                </option>
              ))}
            </select>

            {eligible.length === 0 && (
              <p style={{ color: "#a16207" }}>
                No assigned students match this assessment level.
              </p>
            )}

            <label htmlFor="assessment-due">Due date (optional)</label>
            <input
              id="assessment-due"
              type="date"
              style={input}
              value={assessmentDue}
              onChange={(e) => setAssessmentDue(e.target.value)}
            />

            <button style={button} type="submit" disabled={saving || !assessmentStudent}>
              {saving ? "Assigning..." : "Assign Assessment"}
            </button>
          </form>
        </div>

        <div style={card}>
          <h2>Assessment Assignment History</h2>
          {assessments.length === 0 ? (
            <p>No assessments assigned yet.</p>
          ) : (
            assessments.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "15px 0",
                  borderBottom: "1px solid #dce8e1",
                }}
              >
                <h3>{studentName(a.student_id)}</h3>
                <p>Assessment: {a.assessment_level}</p>
                <p>Assigned: {formatDate(a.assigned_at)}</p>
                <p>Due: {formatDate(a.due_date)}</p>
                <Status value={a.status} />
                {a.status === "submitted" && (
                  <p>Awaiting teacher review. Review controls will be added next.</p>
                )}
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h2>Create Learning Activity</h2>
          <form onSubmit={createActivity}>
            <label htmlFor="activity-title">Activity title *</label>
            <input
              id="activity-title"
              style={input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label htmlFor="activity-description">Activity description</label>
            <textarea
              id="activity-description"
              style={input}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button style={button} type="submit" disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Create Activity"}
            </button>
          </form>
        </div>

        <div style={card}>
          <h2>Assign Learning Activity</h2>
          <form onSubmit={assignActivity}>
            <label htmlFor="activity-student">Select student *</label>
            <select
              id="activity-student"
              style={input}
              value={activityStudent}
              onChange={(e) => setActivityStudent(e.target.value)}
              required
            >
              <option value="">Choose a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>

            <label htmlFor="selected-activity">Select activity *</label>
            <select
              id="selected-activity"
              style={input}
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              required
            >
              <option value="">Choose an activity</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>

            <label htmlFor="activity-due">Due date (optional)</label>
            <input
              id="activity-due"
              type="date"
              style={input}
              value={activityDue}
              onChange={(e) => setActivityDue(e.target.value)}
            />

            <button
              type="submit"
              style={button}
              disabled={saving || !activityStudent || !selectedActivity}
            >
              {saving ? "Assigning..." : "Assign Activity"}
            </button>
          </form>
        </div>

        <div style={card}>
          <h2>My Learning Activities</h2>
          {activities.length === 0 ? (
            <p>No activities created yet.</p>
          ) : (
            activities.map((a) => (
              <div key={a.id} style={{ padding: 14, borderBottom: "1px solid #dce8e1" }}>
                <strong>{a.title}</strong>
                <p>{a.description || "No description"}</p>
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h2>Activity Assignment History</h2>
          {activityAssignments.length === 0 ? (
            <p>No activities assigned yet.</p>
          ) : (
            activityAssignments.map((a) => (
              <div key={a.id} style={{ padding: 14, borderBottom: "1px solid #dce8e1" }}>
                <h3>{activityTitle(a.activity_id)}</h3>
                <p>Student: {studentName(a.student_id)}</p>
                <p>Assigned: {formatDate(a.assigned_at)}</p>
                <p>Due: {formatDate(a.due_date)}</p>
                <Status value={a.status} />
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
