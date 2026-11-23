
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

type ActivityAssignment = {
  id: string;
  student_id: string;
  activity_id: string;
  due_date: string | null;
  status: string;
  assigned_at: string;
};

type AssessmentAssignment = {
  id: string;
  student_id: string;
  assessment_level: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  status: string;
};

type AssessmentLevel = "LP" | "UP" | "HS" | "HSS";

const LEVELS: {
  value: AssessmentLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "LP",
    label: "Lower Primary",
    description: "Classes 1–4",
  },
  {
    value: "UP",
    label: "Upper Primary",
    description: "Classes 5–7",
  },
  {
    value: "HS",
    label: "High School",
    description: "Classes 8–10",
  },
  {
    value: "HSS",
    label: "Higher Secondary",
    description: "Classes 11–12",
  },
];

function getClassNumber(value: string | null): number | null {
  if (!value) return null;

  const cleaned = value.trim().toUpperCase();

  const roman: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
    XII: 12,
  };

  const match = cleaned.match(
    /^(?:CLASS|GRADE|STD|STANDARD)?\s*(\d{1,2}|XII|XI|VIII|VII|VI|IV|IX|III|II|X|V|I)$/i
  );

  if (!match) return null;

  const token = match[1].toUpperCase();
  const number = /^\d+$/.test(token)
    ? Number(token)
    : roman[token];

  return number >= 1 && number <= 12 ? number : null;
}

function getStudentLevel(
  currentClass: string | null
): AssessmentLevel | null {
  const number = getClassNumber(currentClass);

  if (number === null) return null;
  if (number <= 4) return "LP";
  if (number <= 7) return "UP";
  if (number <= 10) return "HS";
  return "HSS";
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";

  const parts = value.slice(0, 10).split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dce8e1",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 4px 18px rgba(20, 60, 45, 0.04)",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 8,
  marginBottom: 18,
  border: "1px solid #dce8e1",
  borderRadius: 9,
  fontSize: 15,
  background: "#ffffff",
  color: "#183a35",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 22px",
  background: "#176b58",
  color: "#ffffff",
  border: "none",
  borderRadius: 9,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<
    string,
    { background: string; color: string }
  > = {
    assigned: {
      background: "#e7efff",
      color: "#2459b2",
    },
    in_progress: {
      background: "#fff3d6",
      color: "#996100",
    },
    submitted: {
      background: "#f3e8ff",
      color: "#7a36b0",
    },
    reviewed: {
      background: "#e1f5e9",
      color: "#176b42",
    },
    pending: {
      background: "#fff3d6",
      color: "#996100",
    },
    completed: {
      background: "#e1f5e9",
      color: "#176b42",
    },
  };

  const selected = colors[status] || {
    background: "#eef1f0",
    color: "#52635e",
  };

  return (
    <span
      style={{
        ...selected,
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function MetricCard({
  title,
  value,
  color,
  description,
}: {
  title: string;
  value: number;
  color: string;
  description: string;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        borderTop: `4px solid ${color}`,
      }}
    >
      <p
        style={{
          color: "#667a74",
          fontSize: 14,
          marginTop: 0,
        }}
      >
        {title}
      </p>

      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color,
          margin: "10px 0",
        }}
      >
        {value}
      </div>

      <p
        style={{
          color: "#667a74",
          fontSize: 12,
          marginBottom: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function BarChart({
  title,
  items,
}: {
  title: string;
  items: {
    label: string;
    value: number;
    color: string;
  }[];
}) {
  const maximum = Math.max(
    1,
    ...items.map((item) => item.value)
  );

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      {items.map((item) => (
        <div key={item.label} style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 8,
              fontSize: 14,
            }}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>

          <div
            style={{
              background: "#edf2ef",
              height: 13,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(item.value / maximum) * 100}%`,
                height: "100%",
                background: item.color,
                borderRadius: 20,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [teacherName, setTeacherName] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<
    LearningActivity[]
  >([]);
  const [activityAssignments, setActivityAssignments] =
    useState<ActivityAssignment[]>([]);
  const [assessmentAssignments, setAssessmentAssignments] =
    useState<AssessmentAssignment[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [assessmentLevel, setAssessmentLevel] =
    useState<AssessmentLevel>("LP");
  const [assessmentStudent, setAssessmentStudent] =
    useState("");
  const [assessmentDueDate, setAssessmentDueDate] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard(uid: string) {
    if (!supabase) return;

    const { data: teacher, error: teacherError } =
      await supabase
        .from("teachers")
        .select("id, status")
        .eq("user_id", uid)
        .single();

    if (
      teacherError ||
      !teacher ||
      teacher.status !== "active"
    ) {
      setErrorMessage(
        "Your teacher account is not active or has not been configured."
      );
      return;
    }

    const { data: links, error: linksError } =
      await supabase
        .from("teacher_assignments")
        .select("student_id")
        .eq("teacher_id", teacher.id);

    if (linksError) {
      setErrorMessage(
        "Unable to load assigned students: " +
          linksError.message
      );
      return;
    }

    const studentIds = [
      ...new Set(
        (links || []).map((link) => link.student_id)
      ),
    ];

    if (studentIds.length > 0) {
      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "id, full_name, current_class, status"
        )
        .in("id", studentIds);

      if (studentError) {
        setErrorMessage(studentError.message);
      } else {
        setStudents(studentData || []);
      }

      const {
        data: assignmentData,
        error: assignmentError,
      } = await supabase
        .from("student_activity_assignments")
        .select(
          "id, student_id, activity_id, due_date, status, assigned_at"
        )
        .in("student_id", studentIds)
        .eq("assigned_by", uid)
        .order("assigned_at", {
          ascending: false,
        });

      if (assignmentError) {
        setErrorMessage(assignmentError.message);
      } else {
        setActivityAssignments(
          assignmentData || []
        );
      }

      const {
        data: assessmentData,
        error: assessmentError,
      } = await supabase
        .from("assessment_assignments")
        .select(
          "id, student_id, assessment_level, assigned_by, assigned_at, due_date, status"
        )
        .in("student_id", studentIds)
        .order("assigned_at", {
          ascending: false,
        });

      if (assessmentError) {
        setErrorMessage(
          "Unable to load assessments: " +
            assessmentError.message
        );
      } else {
        setAssessmentAssignments(
          assessmentData || []
        );
      }
    } else {
      setStudents([]);
      setActivityAssignments([]);
      setAssessmentAssignments([]);
    }

    const {
      data: activityData,
      error: activityError,
    } = await supabase
      .from("learning_activities")
      .select("id, title, description")
      .eq("created_by", uid)
      .order("created_at", {
        ascending: false,
      });

    if (activityError) {
      setErrorMessage(activityError.message);
    } else {
      setActivities(activityData || []);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data, error } =
        await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const user = data.user;

      const {
        data: role,
        error: roleError,
      } = await supabase
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

      try {
        await loadDashboard(user.id);
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Unable to load the teacher dashboard."
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

  async function createActivity(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !supabase ||
      !userId ||
      !title.trim() ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("learning_activities")
        .insert({
          title: title.trim(),
          description:
            description.trim() || null,
          created_by: userId,
        });

      if (error) throw error;

      setTitle("");
      setDescription("");

      setMessage(
        "Learning activity created successfully."
      );

      await loadDashboard(userId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create activity."
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignActivity(
    e: React.FormEvent<HTMLFormElement>
  ) {
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

    try {
      const { error } = await supabase
        .from("student_activity_assignments")
        .insert({
          student_id: selectedStudent,
          activity_id: selectedActivity,
          assigned_by: userId,
          due_date: dueDate || null,
          status: "pending",
        });

      if (error) throw error;

      setSelectedStudent("");
      setSelectedActivity("");
      setDueDate("");

      setMessage(
        "Learning activity assigned successfully."
      );

      await loadDashboard(userId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign activity."
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignAssessment(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !supabase ||
      !userId ||
      !assessmentStudent ||
      saving
    ) {
      return;
    }

    const student = students.find(
      (item) => item.id === assessmentStudent
    );

    if (
      !student ||
      getStudentLevel(student.current_class) !==
        assessmentLevel
    ) {
      setErrorMessage(
        "The student's class does not match the selected assessment level."
      );
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
          assessment_level: assessmentLevel,
          assigned_by: userId,
          due_date:
            assessmentDueDate || null,
          status: "assigned",
        });

      if (error) throw error;

      setAssessmentStudent("");
      setAssessmentDueDate("");

      setMessage(
        "Grade-based assessment assigned successfully."
      );

      await loadDashboard(userId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign assessment."
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

  function getStudentName(id: string) {
    return (
      students.find((student) => student.id === id)
        ?.full_name || "Unknown student"
    );
  }

  function getActivityTitle(id: string) {
    return (
      activities.find(
        (activity) => activity.id === id
      )?.title || "Activity"
    );
  }

  const eligibleStudents = students.filter(
    (student) =>
      getStudentLevel(student.current_class) ===
      assessmentLevel
  );

  const assessmentCounts = {
    assigned: assessmentAssignments.filter(
      (item) => item.status === "assigned"
    ).length,
    inProgress: assessmentAssignments.filter(
      (item) => item.status === "in_progress"
    ).length,
    submitted: assessmentAssignments.filter(
      (item) => item.status === "submitted"
    ).length,
    reviewed: assessmentAssignments.filter(
      (item) => item.status === "reviewed"
    ).length,
  };

  const gradeCounts = LEVELS.map((level) => ({
    label: level.value,
    value: students.filter(
      (student) =>
        getStudentLevel(student.current_class) ===
        level.value
    ).length,
    color:
      level.value === "LP"
        ? "#16a085"
        : level.value === "UP"
        ? "#3979cf"
        : level.value === "HS"
        ? "#9866cf"
        : "#e59b35",
  }));

  const statusChart = [
    {
      label: "Assigned",
      value: assessmentCounts.assigned,
      color: "#3979cf",
    },
    {
      label: "In progress",
      value: assessmentCounts.inProgress,
      color: "#e59b35",
    },
    {
      label: "Submitted",
      value: assessmentCounts.submitted,
      color: "#9866cf",
    },
    {
      label: "Reviewed",
      value: assessmentCounts.reviewed,
      color: "#16a085",
    },
  ];

  if (loading) {
    return (
      <main
        style={{
          padding: 40,
          minHeight: "100vh",
          background: "#f8faf7",
        }}
      >
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
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          background: "#ffffff",
          padding: "20px 6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          borderBottom:
            "1px solid #dce8e1",
        }}
      >
        <strong>
          SWASTHA LEARNING CLINIC
        </strong>

        <button
          onClick={signOut}
          style={{
            ...buttonStyle,
            background: "#183a35",
          }}
        >
          Sign out
        </button>
      </header>

      <section
        style={{
          maxWidth: 1150,
          margin: "auto",
          padding: "36px 20px 70px",
        }}
      >
        <p
          style={{
            color: "#176b58",
            fontWeight: 700,
            letterSpacing: 2,
            fontSize: 12,
          }}
        >
          LEARN • GROW • THRIVE
        </p>

        <h1
          style={{
            fontSize: 34,
            marginBottom: 8,
          }}
        >
          Teacher Dashboard
        </h1>

        <p>
          Welcome, {teacherName}!
        </p>

        <p style={{ color: "#667a74" }}>
          Manage students, learning activities,
          assessments and progress.
        </p>

        {message && (
          <div
            role="status"
            style={{
              background: "#e1f5e9",
              color: "#176b42",
              padding: 15,
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              background: "#fff0ed",
              color: "#b42318",
              padding: 15,
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            {errorMessage}
          </div>
        )}

        <h2>Dashboard Overview</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <MetricCard
            title="Assigned Students"
            value={students.length}
            color="#176b58"
            description="Students under your supervision"
          />

          <MetricCard
            title="Learning Activities"
            value={activities.length}
            color="#3979cf"
            description="Activities you created"
          />

          <MetricCard
            title="Assessments"
            value={assessmentAssignments.length}
            color="#9866cf"
            description="Assessments for your assigned students"
          />

          <MetricCard
            title="Pending Reviews"
            value={assessmentCounts.submitted}
            color="#e59b35"
            description="Submitted assessments awaiting review"
          />
        </div>

        <h2>Assessment Analytics</h2>

        <p style={{ color: "#667a74" }}>
          These charts show assignment counts,
          not confidential assessment scores.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 18,
            marginBottom: 28,
          }}
        >
          <BarChart
            title="Assessment Status"
            items={statusChart}
          />

          <BarChart
            title="Students by Grade Level"
            items={gradeCounts}
          />
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
          }}
        >
          <h2>My Assigned Students</h2>

          {students.length === 0 ? (
            <p>
              No students have been assigned
              to you yet.
            </p>
          ) : (
            students.map((student) => (
              <div
                key={student.id}
                style={{
                  padding: "14px 0",
                  borderBottom:
                    "1px solid #dce8e1",
                }}
              >
                <strong>
                  {student.full_name}
                </strong>

                <p>
                  Class:{" "}
                  {student.current_class ||
                    "Not available"}
                </p>

                <p>
                  Assessment level:{" "}
                  {getStudentLevel(
                    student.current_class
                  ) || "Unrecognized class"}
                </p>

                <StatusBadge
                  status={student.status}
                />
              </div>
            ))
          )}
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
          }}
        >
          <h2>
            Assign Grade-Based Assessment
          </h2>

          <p style={{ color: "#667a74" }}>
            Select an assessment level.
            Only assigned students in the
            matching classes will appear.
          </p>

          <form onSubmit={assignAssessment}>
            <label htmlFor="assessment-level">
              Assessment level *
            </label>

            <select
              id="assessment-level"
              style={inputStyle}
              value={assessmentLevel}
              onChange={(e) => {
                setAssessmentLevel(
                  e.target.value as AssessmentLevel
                );
                setAssessmentStudent("");
              }}
            >
              {LEVELS.map((level) => (
                <option
                  key={level.value}
                  value={level.value}
                >
                  {level.value} — {level.label} (
                  {level.description})
                </option>
              ))}
            </select>

            <label htmlFor="assessment-student">
              Select student *
            </label>

            <select
              id="assessment-student"
              style={inputStyle}
              value={assessmentStudent}
              onChange={(e) =>
                setAssessmentStudent(
                  e.target.value
                )
              }
              required
            >
              <option value="">
                Choose a student
              </option>

              {eligibleStudents.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.full_name} — Class{" "}
                  {student.current_class}
                </option>
              ))}
            </select>

            {eligibleStudents.length === 0 && (
              <p
                style={{
                  color: "#996100",
                  background: "#fff3d6",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                No assigned students match
                this assessment level.
                Check the student's class
                in Supabase.
              </p>
            )}

            <label htmlFor="assessment-due">
              Due date (optional)
            </label>

            <input
              id="assessment-due"
              type="date"
              style={inputStyle}
              value={assessmentDueDate}
              onChange={(e) =>
                setAssessmentDueDate(
                  e.target.value
                )
              }
            />

            <button
              type="submit"
              style={buttonStyle}
              disabled={
                saving ||
                !assessmentStudent
              }
            >
              {saving
                ? "Assigning..."
                : "Assign Assessment"}
            </button>
          </form>
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
          }}
        >
          <h2>
            Assessment Assignment History
          </h2>

          {assessmentAssignments.length === 0 ? (
            <p>
              No assessments assigned yet.
            </p>
          ) : (
            assessmentAssignments.map(
              (assignment) => (
                <div
                  key={assignment.id}
                  style={{
                    padding: "18px 0",
                    borderBottom:
                      "1px solid #dce8e1",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    {getStudentName(
                      assignment.student_id
                    )}
                  </h3>

                  <p>
                    <strong>Level:</strong>{" "}
                    {assignment.assessment_level}
                  </p>

                  <p>
                    <strong>Assigned:</strong>{" "}
                    {formatDate(
                      assignment.assigned_at
                    )}
                  </p>

                  <p>
                    <strong>Due date:</strong>{" "}
                    {formatDate(
                      assignment.due_date
                    )}
                  </p>

                  <StatusBadge
                    status={assignment.status}
                  />

                  {assignment.status ===
                    "submitted" && (
                    <p
                      style={{
                        color: "#7a36b0",
                        fontWeight: 600,
                      }}
                    >
                      Awaiting teacher review.
                      Review and approval controls
                      will be added next.
                    </p>
                  )}

                  {assignment.status ===
                    "reviewed" && (
                    <p
                      style={{
                        color: "#176b42",
                      }}
                    >
                      Teacher review completed.
                    </p>
                  )}
                </div>
              )
            )
          )}
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
          }}
        >
          <h2>Create Learning Activity</h2>

          <form onSubmit={createActivity}>
            <label htmlFor="activity-title">
              Activity title *
            </label>

            <input
              id="activity-title"
              style={inputStyle}
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
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
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Enter activity instructions"
              rows={4}
            />

            <button
              type="submit"
              style={buttonStyle}
              disabled={
                saving || !title.trim()
              }
            >
              {saving
                ? "Saving..."
                : "Create Activity"}
            </button>
          </form>
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
          }}
        >
          <h2>Assign Learning Activity</h2>

          <form onSubmit={assignActivity}>
            <label htmlFor="select-student">
              Select student *
            </label>

            <select
              id="select-student"
              style={inputStyle}
              value={selectedStudent}
              onChange={(e) =>
                setSelectedStudent(
                  e.target.value
                )
              }
              required
            >
              <option value="">
                Choose a student
              </option>

              {students.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
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
              onChange={(e) =>
                setSelectedActivity(
                  e.target.value
                )
              }
              required
            >
              <option value="">
                Choose an activity
              </option>

              {activities.map((activity) => (
                <option
                  key={activity.id}
                  value={activity.id}
                >
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
              onChange={(e) =>
                setDueDate(e.target.value)
              }
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
              {saving
                ? "Assigning..."
                : "Assign Activity"}
            </button>
          </form>
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: 24,
          }}
        >
          <h2>My Learning Activities</h2>

          {activities.length === 0 ? (
            <p>
              No activities created yet.
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  padding: "14px 0",
                  borderBottom:
                    "1px solid #dce8e1",
                }}
              >
                <strong>
                  {activity.title}
                </strong>

                <p>
                  {activity.description ||
                    "No description"}
                </p>
              </div>
            ))
          )}
        </div>

        <div style={cardStyle}>
          <h2>
            Activity Assignment History
          </h2>

          {activityAssignments.length === 0 ? (
            <p>
              No activities assigned yet.
            </p>
          ) : (
            activityAssignments.map(
              (assignment) => (
                <div
                  key={assignment.id}
                  style={{
                    padding: "14px 0",
                    borderBottom:
                      "1px solid #dce8e1",
                  }}
                >
                  <h3>
                    {getActivityTitle(
                      assignment.activity_id
                    )}
                  </h3>

                  <p>
                    <strong>Student:</strong>{" "}
                    {getStudentName(
                      assignment.student_id
                    )}
                  </p>

                  <p>
                    <strong>Due date:</strong>{" "}
                    {formatDate(
                      assignment.due_date
                    )}
                  </p>

                  <StatusBadge
                    status={assignment.status}
                  />
                </div>
              )
            )
          )}
        </div>
      </section>
    </main>
  );
}
