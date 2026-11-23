
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: string;
  full_name: string;
  current_class: string | null;
  status: string;
};

type LearningActivity = {
  id: string;
  title: string;
  description: string | null;
};

type Assignment = {
  id: string;
  student_id: string;
  activity_id: string;
  due_date: string | null;
  status: string;
  assigned_at: string;
};

export default function TeacherDashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [dueDate, setDueDate] = useState("");

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
      setErrorMessage(
        "Your teacher account is not active or has not been configured."
      );
      return;
    }

    const { data: links, error: linksError } = await supabase
      .from("teacher_assignments")
      .select("student_id")
      .eq("teacher_id", teacher.id);

    if (linksError) {
      setErrorMessage("Unable to load assigned students.");
      return;
    }

    const studentIds = [...new Set(
      (links || []).map((link) => link.student_id)
    )];

    if (studentIds.length > 0) {
      const { data: studentData, error: studentError } =
        await supabase
          .from("students")
          .select("id, full_name, current_class, status")
          .in("id", studentIds);

      if (studentError) {
        setErrorMessage("Unable to load student details.");
      } else {
        setStudents(studentData || []);
      }

      const { data: assignmentData, error: assignmentError } =
        await supabase
          .from("student_activity_assignments")
          .select(
            "id, student_id, activity_id, due_date, status, assigned_at"
          )
          .in("student_id", studentIds)
          .eq("assigned_by", uid)
          .order("assigned_at", { ascending: false });

      if (assignmentError) {
        setErrorMessage("Unable to load activity assignments.");
      } else {
        setAssignments(assignmentData || []);
      }
    } else {
      setStudents([]);
      setAssignments([]);
    }

    const { data: activityData, error: activityError } =
      await supabase
        .from("learning_activities")
        .select("id, title, description")
        .eq("created_by", uid)
        .order("created_at", { ascending: false });

    if (activityError) {
      setErrorMessage("Unable to load learning activities.");
    } else {
      setActivities(activityData || []);
    }
  }

  useEffect(() => {
    async function initialize() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.auth.getUser();

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

      if (roleError || !role) {
        router.replace("/login");
        return;
      }

      if (role.role !== "teacher") {
        if (role.role === "admin") {
          router.replace("/admin/dashboard");
        } else if (role.role === "parent") {
          router.replace("/parent/dashboard");
        } else {
          router.replace("/login");
        }
        return;
      }

      setUserId(user.id);
      setTeacherName(
        user.user_metadata?.full_name ||
        user.email ||
        "Teacher"
      );

      await loadDashboard(user.id);
      setLoading(false);
    }

    initialize();
  }, [router]);

  async function createActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase || !userId || saving) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("learning_activities")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        created_by: userId,
      });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setTitle("");
      setDescription("");
      setMessage("Learning activity created successfully.");
      await loadDashboard(userId);
    }

    setSaving(false);
  }

  async function assignActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !supabase ||
      !userId ||
      !selectedStudent ||
      !selectedActivity ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_activity_assignments")
      .insert({
        student_id: selectedStudent,
        activity_id: selectedActivity,
        assigned_by: userId,
        due_date: dueDate || null,
        status: "pending",
      });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSelectedStudent("");
      setSelectedActivity("");
      setDueDate("");
      setMessage("Activity assigned successfully.");
      await loadDashboard(userId);
    }

    setSaving(false);
  }

  async function signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace("/login");
  }

  function getStudentName(id: string) {
    return students.find((s) => s.id === id)?.full_name ||
      "Unknown student";
  }

  function getActivityTitle(id: string) {
    return activities.find((a) => a.id === id)?.title ||
      "Activity";
  }

  function formatDate(date: string | null) {
    if (!date) return "Not set";
    const parts = date.slice(0, 10).split("-");
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #dce8e1",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  };

  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: 12,
    marginTop: 8,
    marginBottom: 18,
    border: "1px solid #dce8e1",
    borderRadius: 8,
    fontSize: 15,
    background: "#ffffff",
    color: "#183a35",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px 22px",
    background: "#176b58",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  };

  if (loading) {
    return (
      <main style={{ padding: 40 }}>
        Loading Teacher Dashboard...
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
          background: "#ffffff",
          padding: "20px 6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          borderBottom: "1px solid #dce8e1",
        }}
      >
        <strong>SWASTHA LEARNING CLINIC</strong>
        <button onClick={signOut}>Sign out</button>
      </header>

      <section
        style={{
          maxWidth: 1050,
          margin: "auto",
          padding: "40px 20px",
        }}
      >
        <p>LEARN • GROW • THRIVE</p>
        <h1>Teacher Dashboard</h1>
        <p>Welcome, {teacherName}!</p>

        {message && (
          <p role="status" style={{ color: "#176b58" }}>
            {message}
          </p>
        )}

        {errorMessage && (
          <p role="alert" style={{ color: "#b42318" }}>
            {errorMessage}
          </p>
        )}

        <div style={cardStyle}>
          <h2>My Assigned Students</h2>

          {students.length === 0 ? (
            <p>No students have been assigned to you yet.</p>
          ) : (
            students.map((student) => (
              <div
                key={student.id}
                style={{
                  padding: 14,
                  borderBottom: "1px solid #dce8e1",
                }}
              >
                <strong>{student.full_name}</strong>
                <p>
                  Class: {student.current_class || "Not available"}
                </p>
                <p>Status: {student.status}</p>
              </div>
            ))
          )}
        </div>

        <div style={cardStyle}>
          <h2>Create Learning Activity</h2>

          <form onSubmit={createActivity}>
            <label htmlFor="activity-title">
              Activity title *
            </label>
            <input
              id="activity-title"
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Reading practice"
              required
            />

            <label htmlFor="activity-description">
              Activity description
            </label>
            <textarea
              id="activity-description"
              style={inputStyle}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter activity instructions"
              rows={4}
            />

            <button
              type="submit"
              style={buttonStyle}
              disabled={saving || !title.trim()}
            >
              {saving ? "Saving..." : "Create Activity"}
            </button>
          </form>
        </div>

        <div style={cardStyle}>
          <h2>Assign Learning Activity</h2>

          <form onSubmit={assignActivity}>
            <label htmlFor="select-student">
              Select student *
            </label>
            <select
              id="select-student"
              style={inputStyle}
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              required
            >
              <option value="">Choose a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>

            <label htmlFor="select-activity">
              Select activity *
            </label>
            <select
              id="select-activity"
              style={inputStyle}
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              required
            >
              <option value="">Choose an activity</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>

            <label htmlFor="due-date">
              Due date (optional)
            </label>
            <input
              id="due-date"
              type="date"
              style={inputStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <button
              type="submit"
              style={buttonStyle}
              disabled={
                saving ||
                !selectedStudent ||
                !selectedActivity
              }
            >
              {saving ? "Assigning..." : "Assign Activity"}
            </button>
          </form>
        </div>

        <div style={cardStyle}>
          <h2>My Learning Activities</h2>

          {activities.length === 0 ? (
            <p>No activities created yet.</p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  padding: 14,
                  borderBottom: "1px solid #dce8e1",
                }}
              >
                <strong>{activity.title}</strong>
                <p>{activity.description || "No description"}</p>
              </div>
            ))
          )}
        </div>

        <div style={cardStyle}>
          <h2>Activity Assignment History</h2>

          {assignments.length === 0 ? (
            <p>No activities assigned yet.</p>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                style={{
                  padding: 14,
                  borderBottom: "1px solid #dce8e1",
                }}
              >
                <h3>
                  {getActivityTitle(assignment.activity_id)}
                </h3>
                <p>
                  <strong>Student:</strong>{" "}
                  {getStudentName(assignment.student_id)}
                </p>
                <p>
                  <strong>Due date:</strong>{" "}
                  {formatDate(assignment.due_date)}
                </p>
                <p>
                  <strong>Status:</strong> {assignment.status}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
