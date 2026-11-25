"use client";

import BrandLogo from "../../components/brand-logo";
import StaffNotificationsPopup from "../../components/staff-notifications-popup";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import AssessmentAnalytics from "../assessment-analytics";
import LearningInsightsCharts from "../../components/learning-insights-charts";

type Level = "LP" | "UP" | "HS" | "HSS";
type Tab = "overview" | "assessments" | "activities" | "students";

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
  guardian_email: string | null;
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

type Assessment = {
  id: string;
  student_id: string;
  assessment_level: Level;
  status: string;
  due_date: string | null;
  assigned_at: string;
};

const LEVELS: {
  value: Level;
  label: string;
  color: string;
}[] = [
  { value: "LP", label: "Classes 1–4", color: "#176b58" },
  { value: "UP", label: "Classes 5–7", color: "#2563eb" },
  { value: "HS", label: "Classes 8–10", color: "#7c3aed" },
  { value: "HSS", label: "Classes 11–12", color: "#d97706" },
];

const ROMAN: Record<string, number> = {
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

const STATUS_COLORS: Record<string, string> = {
  assigned: "#2563eb",
  in_progress: "#d97706",
  submitted: "#7c3aed",
  reviewed: "#16805d",
  pending: "#d97706",
  completed: "#16805d",
  active: "#16805d",
};

function getLevel(value: string | null): Level | null {
  if (!value) return null;

  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/^(CLASS|GRADE|STD|STANDARD)\s*[-:]?\s*/, "");

  const number = /^\d{1,2}$/.test(cleaned)
    ? Number(cleaned)
    : ROMAN[cleaned];

  if (!number || number < 1 || number > 12) return null;
  if (number <= 4) return "LP";
  if (number <= 7) return "UP";
  if (number <= 10) return "HS";
  return "HSS";
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const parts = value.slice(0, 10).split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

const panel: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dce8e1",
  borderRadius: 13,
  padding: 16,
  boxShadow: "0 3px 14px rgba(24,58,53,0.04)",
};

const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 7,
  border: "1px solid #dce8e1",
  borderRadius: 9,
  background: "#ffffff",
  color: "#183a35",
  boxSizing: "border-box",
  fontSize: 14,
};

const primaryButton: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  background: "#176b58",
  color: "#ffffff",
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: 12,
};

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: 20,
        background: STATUS_COLORS[value] || "#64748b",
        color: "#ffffff",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

function Metric({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        ...panel,
        borderTop: `4px solid ${color}`,
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        width: "100%",
        color: "#183a35",
      }}
    >
      <div
        style={{
          color: "#667a74",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color,
          fontSize: 27,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        {value}
      </div>

      {onClick && (
        <div
          style={{
            fontSize: 12,
            color: "#667a74",
            marginTop: 8,
          }}
        >
          Click to view details
        </div>
      )}
    </button>
  );
}

function DonutChart({
  segments,
  label,
}: {
  segments: {
    label: string;
    value: number;
    color: string;
  }[];
  label: string;
}) {
  const total = segments.reduce(
    (sum, segment) => sum + segment.value,
    0
  );

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 22,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 170,
          height: 170,
          position: "relative",
        }}
      >
        <svg
          viewBox="0 0 140 140"
          style={{ width: "100%", height: "100%" }}
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e9efeb"
            strokeWidth="17"
          />

          <g transform="rotate(-90 70 70)">
            {total > 0 &&
              segments.map((segment) => {
                const fraction = segment.value / total;
                const currentOffset = offset;

                offset += fraction * circumference;

                return (
                  <circle
                    key={segment.label}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="17"
                    strokeDasharray={`${
                      fraction * circumference
                    } ${circumference}`}
                    strokeDashoffset={-currentOffset}
                  />
                );
              })}
          </g>

          <text
            x="70"
            y="67"
            textAnchor="middle"
            fontSize="26"
            fontWeight="800"
            fill="#183a35"
          >
            {total}
          </text>

          <text
            x="70"
            y="85"
            textAnchor="middle"
            fontSize="11"
            fill="#667a74"
          >
            {label}
          </text>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 170 }}>
        {segments.map((segment) => (
          <div
            key={segment.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "8px 0",
              borderBottom: "1px solid #edf2ee",
              fontSize: 13,
            }}
          >
            <span>
              <span
                style={{
                  color: segment.color,
                  marginRight: 8,
                }}
              >
                ●
              </span>
              {segment.label}
            </span>

            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({
  items,
}: {
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
    <div style={{ display: "grid", gap: 16 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 7,
              fontSize: 13,
            }}
          >
            <strong>{item.label}</strong>
            <strong>{item.value}</strong>
          </div>

          <div
            style={{
              height: 14,
              borderRadius: 20,
              overflow: "hidden",
              background: "#e9efeb",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(item.value / maximum) * 100}%`,
                background: item.color,
                borderRadius: 20,
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
  const [teacherName, setTeacherName] = useState("Teacher");
  const [pendingFollowupCount, setPendingFollowupCount] = useState<number | null>(null);

  // Refresh the shared appointment queue count when the dashboard is opened,
  // revisited, or remains open while follow-ups are being processed.
  useEffect(() => {
    let active = true;
    async function refreshPendingFollowups() {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { count, error } = await supabase
        .from("appointment_enquiries")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "contacted", "appointment_scheduled"]);
      if (active) setPendingFollowupCount(error ? null : (count ?? 0));
    }
    void refreshPendingFollowups();
    const interval = window.setInterval(() => { void refreshPendingFollowups(); }, 60000);
    window.addEventListener("focus", refreshPendingFollowups);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshPendingFollowups);
    };
  }, []);


  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [activityAssignments, setActivityAssignments] =
    useState<ActivityAssignment[]>([]);

  const [assessments, setAssessments] =
    useState<Assessment[]>([]);

  const [profileId, setProfileId] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] =
    useState("");

  const [level, setLevel] = useState<Level>("LP");
  const [assessmentStudent, setAssessmentStudent] =
    useState("");
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

  const loadDashboard = useCallback(async (uid: string) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data: teacher, error: teacherError } =
      await supabase
        .from("teachers")
        .select("id, status")
        .eq("user_id", uid)
        .single();

    if (teacherError) throw teacherError;

    if (!teacher || teacher.status !== "active") {
      throw new Error("Your teacher account is not active.");
    }

    const { data: links, error: linkError } =
      await supabase
        .from("teacher_assignments")
        .select("student_id")
        .eq("teacher_id", teacher.id);

    if (linkError) throw linkError;

    const ids = [
      ...new Set(
        (links || []).map((link) => link.student_id)
      ),
    ];

    const { data: activityData, error: activityError } =
      await supabase
        .from("learning_activities")
        .select("id, title, description")
        .eq("created_by", uid)
        .order("created_at", { ascending: false });

    if (activityError) throw activityError;

    setActivities(activityData || []);

    if (ids.length === 0) {
      setStudents([]);
      setGuardians([]);
      setActivityAssignments([]);
      setAssessments([]);
      setProfileId("");
      return;
    }

    const [
      studentResult,
      guardianResult,
      assignmentResult,
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
        .select(
          "id, student_id, activity_id, status, due_date, assigned_at"
        )
        .in("student_id", ids)
        .eq("assigned_by", uid)
        .order("assigned_at", { ascending: false }),

      supabase
        .from("assessment_assignments")
        .select(
          "id, student_id, assessment_level, status, due_date, assigned_at"
        )
        .in("student_id", ids)
        .order("assigned_at", { ascending: false }),
    ]);

    if (studentResult.error) throw studentResult.error;
    if (guardianResult.error) throw guardianResult.error;
    if (assignmentResult.error) throw assignmentResult.error;
    if (assessmentResult.error) throw assessmentResult.error;

    setStudents(studentResult.data || []);

    setGuardians(
      ((guardianResult.data || []) as Guardian[]).filter(
        (guardian) => ids.includes(guardian.student_id)
      )
    );

    setActivityAssignments(assignmentResult.data || []);

    setAssessments(
      (assessmentResult.data || []) as Assessment[]
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!supabase) {
        if (!cancelled) {
          setErrorMessage("Supabase is not configured.");
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } =
          await supabase.auth.getUser();

        if (cancelled) return;

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const uid = data.user.id;

        const { data: roleData, error: roleError } =
          await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid)
            .single();

        if (cancelled) return;

        if (roleError || !roleData) {
          throw new Error(
            "Unable to verify your account role."
          );
        }

        if (roleData.role !== "teacher") {
          router.replace(
            roleData.role === "admin"
              ? "/admin/dashboard"
              : roleData.role === "parent"
              ? "/parent/dashboard"
              : "/login"
          );
          return;
        }

        setUserId(uid);

        const {data:myProfile}=await supabase.from("profiles").select("full_name,staff_code").eq("id",uid).maybeSingle();
        setTeacherName((myProfile?.full_name||data.user.user_metadata?.full_name||data.user.email||"Teacher")+(myProfile?.staff_code?" · "+myProfile.staff_code:""));

        await loadDashboard(uid);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [router, loadDashboard]);

  async function refresh() {
    if (!userId) return;

    try {
      await loadDashboard(userId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Unable to refresh dashboard."
      );
    }
  }

  async function createActivity(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!supabase || !userId || !title.trim() || saving) {
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
          description: description.trim() || null,
          created_by: userId,
        });

      if (error) throw error;

      setTitle("");
      setDescription("");

      setMessage(
        "Learning activity created successfully."
      );

      await refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
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
      !activityStudent ||
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

      setMessage(
        "Learning activity assigned successfully."
      );

      await refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
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
      (s) => s.id === assessmentStudent
    );

    if (
      !student ||
      getLevel(student.current_class) !== level
    ) {
      setErrorMessage(
        "Student class does not match assessment level."
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
          assessment_level: level,
          assigned_by: userId,
          due_date: assessmentDue || null,
          status: "assigned",
        });

      if (error) throw error;

      setAssessmentStudent("");
      setAssessmentDue("");

      setMessage(
        "Assessment assigned successfully."
      );

      await refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
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

  function studentName(id: string) {
    return (
      ((s:Student|undefined)=>s?s.full_name+" · "+(s.student_code||"Student ID pending"):"Unknown student")(students.find((s) => s.id === id))
    );
  }

  function activityTitle(id: string) {
    return (
      activities.find((a) => a.id === id)?.title ||
      "Activity"
    );
  }

  const eligibleStudents = students.filter(
    (student) =>
      getLevel(student.current_class) === level
  );

  const selectedProfile = students.find(
    (student) => student.id === profileId
  );

  const profileGuardians = guardians.filter(
    (guardian) => guardian.student_id === profileId
  );

  const selectedAssessment = assessments.find(
    (assessment) =>
      assessment.id === selectedAssessmentId
  );

  const assessmentSegments = [
    {
      label: "Assigned",
      value: assessments.filter(
        (a) => a.status === "assigned"
      ).length,
      color: "#2563eb",
    },
    {
      label: "In Progress",
      value: assessments.filter(
        (a) => a.status === "in_progress"
      ).length,
      color: "#d97706",
    },
    {
      label: "Submitted",
      value: assessments.filter(
        (a) => a.status === "submitted"
      ).length,
      color: "#7c3aed",
    },
    {
      label: "Reviewed",
      value: assessments.filter(
        (a) => a.status === "reviewed"
      ).length,
      color: "#16805d",
    },
  ];

  const gradeBars = LEVELS.map((item) => ({
    label: `${item.value} — ${item.label}`,
    value: students.filter(
      (student) =>
        getLevel(student.current_class) === item.value
    ).length,
    color: item.color,
  }));

  const completedActivities =
    activityAssignments.filter(
      (assignment) =>
        assignment.status === "completed" ||
        assignment.status === "reviewed"
    ).length;

  const pendingActivities =
    activityAssignments.length - completedActivities;

  const completionPercent =
    activityAssignments.length > 0
      ? Math.round(
          (completedActivities /
            activityAssignments.length) *
            100
        )
      : 0;

  const languageCounts = students.reduce<
    Record<string, number>
  >((acc, student) => {
    const language =
      student.preferred_language?.trim() ||
      "Unspecified";

    acc[language] = (acc[language] || 0) + 1;

    return acc;
  }, {});

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8faf7",
          color: "#183a35",
        }}
      >
        Loading Swastha Teacher Workspace...
      </main>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8faf7",
        color: "#183a35",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #dce8e1",
          padding: "18px 5%",
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: "auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div>
            <strong
              style={{
                color: "#176b58",
                letterSpacing: 1,
              }}
            >
              <BrandLogo />
            </strong>

            <div
              style={{
                fontSize: 12,
                color: "#667a74",
                marginTop: 5,
              }}
            >
              STAFF PORTAL
            </div>


          </div>

          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <StaffNotificationsPopup/>
          <button type="button" onClick={()=>router.push("/teacher/appointments")}
            style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,background:"#fff1f2",color:"#b42318",border:"1px solid #fecdd3"}}>
            Appointment{pendingFollowupCount === null ? "" : ` (${pendingFollowupCount})`}
          </button>
          <button type="button" onClick={()=>router.push("/my-profile")}
            style={{...primaryButton,background:"#eaf4ef",color:"#176b58",border:"1px solid #b9d9cc"}}>My Profile</button>
          <button
            type="button"
            onClick={signOut}
            style={{
              ...primaryButton,
              background: "#ffffff",
              color: "#183a35",
              border: "1px solid #dce8e1",
            }}
          >
            Sign out
          </button>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1160,
          margin: "auto",
          padding: "30px 20px 70px",
        }}
      >
        <section style={{ ...panel, background: "#0f4c5c", color: "#ffffff", marginBottom: 20, padding: "22px 20px" }}>
          <small style={{letterSpacing:1,fontWeight:700}}>LEARN • GROW • THRIVE</small>
          <h1 style={{margin:"10px 0 8px",fontSize:29,overflowWrap:"anywhere"}}>Welcome, {teacherName}!</h1>
          <p style={{margin:0}}>Manage your assigned students, assessments and learning activities.</p>
        </section>

        {message && (
          <div
            role="status"
            style={{
              padding: 15,
              borderRadius: 10,
              background: "#e4f5ea",
              color: "#176b42",
              marginBottom: 18,
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: 15,
              borderRadius: 10,
              background: "#fff0ed",
              color: "#b42318",
              marginBottom: 18,
            }}
          >
            {errorMessage}
          </div>
        )}

        <nav
          aria-label="Teacher dashboard sections"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 25,
            padding: 7,
            border: "1px solid #dce8e1",
            borderRadius: 13,
            background: "#ffffff",
          }}
        >
          {(
            [
              ["overview", "Overview"],
              ["assessments", "Assessments"],
              ["activities", "Learning Activities"],
              ["students", "My Students"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={
                activeTab === id ? "page" : undefined
              }
              style={{
                ...primaryButton,
                background:
                  activeTab === id
                    ? "#176b58"
                    : "#f8faf7",
                color:
                  activeTab === id
                    ? "#ffffff"
                    : "#183a35",
                flex: "1 1 130px",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 25,
          }}
        >
          <Metric
            label="Assigned Students"
            value={students.length}
            color="#176b58"
            onClick={() => setActiveTab("students")}
          />

          <Metric
            label="Learning Activities"
            value={activities.length}
            color="#2563eb"
            onClick={() => setActiveTab("activities")}
          />

          <Metric
            label="Assessments"
            value={assessments.length}
            color="#7c3aed"
            onClick={() => setActiveTab("assessments")}
          />

          <Metric
            label="Pending Reviews"
            value={
              assessments.filter(
                (a) => a.status === "submitted"
              ).length
            }
            color="#d97706"
            onClick={() => {
              const pending = assessments.find((a) => a.status === "submitted");
              if (pending) router.push("/teacher/assessment-review/" + pending.id);
              else setActiveTab("assessments");
            }}
          />
        </section>

        <div style={{marginBottom:24}}>
          <section aria-label="Teacher Command Centre" style={{background:"linear-gradient(120deg,#132838,#0f4c5c)",color:"#fff",padding:24,borderRadius:16,marginBottom:0,minWidth:0,boxSizing:"border-box",overflowWrap:"anywhere"}}>
              <div style={{fontSize:12,letterSpacing:2,color:"#e6c875"}}>SWASTHA 2030 · TEACHER WORKSPACE</div>
              <h2 style={{margin:"8px 0"}}>Clinical & Educational Command Centre</h2>
              <p style={{color:"#dbeafe"}}>Monitor your assigned students and open existing development workflows.</p>
              {activeTab === "overview" && <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                <span>Reviewed assessments: <strong>{assessments.filter(a=>a.status==="reviewed").length}</strong></span>
                <span>Completed activity assignments: <strong>{completedActivities}</strong> / {activityAssignments.length}</span>
              </div>}
                    <div aria-label="Staff tools" style={{marginTop:20,paddingTop:18,borderTop:"1px solid #ffffff35",minWidth:0}}>
          <h2 style={{fontSize:18,margin:"0 0 12px"}}>Staff Tools</h2>
          <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",alignItems:"stretch"}}>
          <button type="button" onClick={()=>router.push("/teacher/custom-assessments")}
            style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,background:"#176b58",color:"white"}}>
            + Custom Assessment Builder
          </button>
          <button type="button" onClick={()=>router.push("/teacher/coordination")}
            style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,background:"#0f4c5c",color:"#fff"}}>
            Teacher Coordination
          </button>
          
          <button type="button" style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,background:"#14532d"}} onClick={()=>router.push("/staff/operations")}>Clinic Operations & Calendar</button>
          <button type="button" style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,background:"#0f4c5c"}} onClick={()=>router.push("/teacher/sessions")}>Sessions & Attendance</button>
          <button type="button" onClick={()=>router.push("/staff/assessment-certificates")} style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,background:"#176b58"}}>Assessment Certificates</button>
          <button type="button" onClick={()=>router.push("/teacher/student-progress")} style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,marginRight:0}}>Student Progress Tracking</button>
          <button type="button" onClick={()=>router.push("/teacher/idp")}
            style={{...primaryButton,whiteSpace:"normal",minWidth:0,margin:0,background:"#0f4c5c",color:"white"}}>
            Individual Development Plan (IDP)
          </button>
          </div>
        </div>

          </section>
        </div>

        {activeTab === "overview" && (
          <section>

            <h2>Analytics & Charts Overview</h2>

            <p style={{ color: "#667a74" }}>
              Live counts from your assigned students
              and activities.
            </p>

            <div style={grid}>
              <div style={panel}>
                <h3>Assessment Pipeline Breakdown</h3>

                <DonutChart
                  segments={assessmentSegments}
                  label="Total"
                />
              </div>

              <div style={panel}>
                <h3>Students by Grade Level</h3>

                <BarChart items={gradeBars} />
              </div>

              <div style={panel}>
                <h3>Learning Activity Completion Rate</h3>

                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 800,
                    color: "#176b58",
                    marginBottom: 12,
                  }}
                >
                  {completionPercent}%
                </div>

                <div
                  style={{
                    height: 18,
                    background: "#e9efeb",
                    borderRadius: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${completionPercent}%`,
                      background: "#176b58",
                    }}
                  />
                </div>

                <p style={{ color: "#667a74" }}>
                  Completed: {completedActivities} /{" "}
                  {activityAssignments.length}
                </p>

                <p style={{ color: "#667a74" }}>
                  Pending / Active: {pendingActivities}
                </p>
              </div>

              <div style={panel}>
                <h3>Student Preferred Languages</h3>

                {Object.keys(languageCounts).length === 0 ? (
                  <p>No student data yet.</p>
                ) : (
                  <BarChart
                    items={Object.entries(
                      languageCounts
                    ).map(([language, count], index) => ({
                      label: language,
                      value: count,
                      color: [
                        "#176b58",
                        "#2563eb",
                        "#7c3aed",
                        "#d97706",
                      ][index % 4],
                    }))}
                  />
                )}
              </div>
            </div>
            <LearningInsightsCharts hideStudentOverview audience="teacher" students={students} assessments={assessments} activities={activityAssignments}/>
            <section style={{...panel,marginTop:16}}>
              <h3>Assessment Assignment Trends</h3>
              <p style={{color:"#667a74",fontSize:13}}>Monthly assignment volume and current review status, not historical review dates or ability scores.</p>
              {Array.from(new Set(assessments.map(a=>a.assigned_at.slice(0,7)))).sort().slice(-12).map(month=>{
                const rows=assessments.filter(a=>a.assigned_at.startsWith(month));
                const reviewed=rows.filter(a=>a.status==="reviewed").length;
                return <div key={month} style={{marginBottom:12}}><div>{month} · {reviewed} reviewed / {rows.length} assigned</div><div style={{height:12,background:"#e9efeb",borderRadius:8}}><div style={{height:12,width:(reviewed/rows.length*100)+"%",background:"#176b58",borderRadius:8}}/></div></div>;
              })}
              {!assessments.length&&<p>No assessment history available.</p>}
            </section>
            <section aria-label="Analytics Dashboard" style={{...panel,marginTop:24,minWidth:0}}>
              <h2 style={{marginTop:0,color:"#0f4c5c"}}>Analytics Dashboard</h2>
              <AssessmentAnalytics assessments={assessments} students={students} hideDashboardTitle>
              {(selectedStudentId)=>(
            <section style={{...panel,marginTop:16}}>
              <h3>Student Development Journey & Progress Overview</h3>
              <p style={{color:"#667a74"}}>Observed milestones for the selected student. Open the linked workflows to verify plan, report and certificate status.</p>
              {!selectedStudentId?<p>No student assessment selected.</p>:students.filter(student=>student.id===selectedStudentId).map(student=>{
                const records=assessments.filter(a=>a.student_id===student.id);
                const tasks=activityAssignments.filter(a=>a.student_id===student.id);
                const reviewed=records.filter(a=>a.status==="reviewed");
                const done=tasks.filter(a=>a.status==="completed"||a.status==="reviewed").length;
                const stages=[
                  ["Registration","Recorded"],
                  ["Baseline assessment",records.length?"Assigned":"Not assigned"],
                  ["Teacher review",reviewed.length?"Reviewed":"Not confirmed"],
                  ["Individual development plan","Open plan"],
                  ["Learning activities",tasks.length?done+" / "+tasks.length+" completed":"Not assigned"],
                  ["Reassessment","Verify history"],
                  ["Progress report","Open progress"],
                  ["Certificate","Verify issuance"]
                ];
                return <details open key={student.id} style={{border:"1px solid #dce8e1",borderRadius:10,padding:12,marginBottom:10}}>
                  <summary style={{cursor:"pointer",fontWeight:700}}>{student.full_name} ({student.student_code||"ID unavailable"})</summary>
                  <div style={{marginTop:10,fontSize:13,color:"#0f4c5c"}}>{reviewed.length}/{records.length} assessments reviewed · {tasks.length?done+"/"+tasks.length+" activities completed ("+Math.round(done/tasks.length*100)+"%)":"No activities assigned"}</div>
                  {tasks.length>0&&<div role="progressbar" aria-label={"Activity completion for "+student.full_name} aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={done} style={{height:10,background:"#e2e8f0",borderRadius:8,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:(done/tasks.length*100)+"%",background:"#176b58"}}/></div>}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:8,marginTop:12}}>
                    {stages.map(([label,status],i)=><div key={label} style={{padding:10,background:"#f3f9f6",borderRadius:8}}><small>{i+1}. {label}</small><div style={{fontWeight:700,fontSize:13}}>{status}</div></div>)}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                    <button type="button" style={primaryButton} onClick={()=>{setProfileId(student.id);setActiveTab("students");}}>Student & guardian records</button>
                    <button type="button" style={primaryButton} onClick={()=>router.push("/teacher/idp?student="+encodeURIComponent(student.id))}>Open IDP</button>
                    
                    
                  </div>
                </details>;
              })}
            </section>
                            )}
              </AssessmentAnalytics>
            </section>
          </section>
        )}

        {activeTab === "assessments" && (
          <section>
            <h2>Grade-Based Assessments</h2>

            <div style={grid}>
              <div style={panel}>
                <h3>Assign Grade-Based Assessment</h3>

                <p
                  style={{
                    color: "#667a74",
                    fontSize: 13,
                  }}
                >
                  Select the assessment level and an
                  eligible student.
                </p>

                <form onSubmit={assignAssessment}>
                  <label htmlFor="assessment-level">
                    Assessment level *
                  </label>

                  <select
                    id="assessment-level"
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value as Level);
                      setAssessmentStudent("");
                    }}
                    style={field}
                  >
                    {LEVELS.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.value} — {item.label}
                      </option>
                    ))}
                  </select>

                  <div style={{ height: 18 }} />

                  <label htmlFor="assessment-student">
                    Select student *
                  </label>

                  <select
                    id="assessment-student"
                    value={assessmentStudent}
                    onChange={(e) =>
                      setAssessmentStudent(e.target.value)
                    }
                    style={field}
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
                        {student.full_name} · {student.student_code} —{" "}
                        {student.current_class}
                      </option>
                    ))}
                  </select>

                  {eligibleStudents.length === 0 && (
                    <p
                      style={{
                        color: "#a16207",
                        fontSize: 13,
                      }}
                    >
                      No assigned students match {level}.
                    </p>
                  )}

                  <div style={{ height: 18 }} />

                  <label htmlFor="assessment-due">
                    Due date (optional)
                  </label>

                  <input
                    id="assessment-due"
                    type="date"
                    value={assessmentDue}
                    onChange={(e) =>
                      setAssessmentDue(e.target.value)
                    }
                    style={field}
                  />

                  <div style={{ height: 20 }} />

                  <button
                    type="submit"
                    style={primaryButton}
                    disabled={
                      saving || !assessmentStudent
                    }
                  >
                    {saving
                      ? "Assigning..."
                      : `Assign ${level} Assessment`}
                  </button>
                </form>
              </div>

              <div style={panel}>
                <h3>
                  Assessment Assignment History (
                  {assessments.length})
                </h3>

                {assessments.length === 0 ? (
                  <p>No assessments assigned yet.</p>
                ) : (
                  assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      style={{
                        borderBottom:
                          "1px solid #dce8e1",
                        padding: "15px 0",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAssessmentId(
                            selectedAssessmentId ===
                              assessment.id
                              ? ""
                              : assessment.id
                          )
                        }
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: 12,
                          background:
                            selectedAssessmentId ===
                            assessment.id
                              ? "#f2f8f4"
                              : "#ffffff",
                          border:
                            "1px solid #dce8e1",
                          borderRadius: 10,
                          cursor: "pointer",
                          color: "#183a35",
                        }}
                      >
                        <strong>
                          {studentName(
                            assessment.student_id
                          )}
                        </strong>

                        <div
                          style={{
                            fontSize: 13,
                            marginTop: 7,
                          }}
                        >
                          Level:{" "}
                          {assessment.assessment_level}
                        </div>

                        <div style={{ marginTop: 9 }}>
                          <StatusBadge
                            value={assessment.status}
                          />
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            marginTop: 8,
                            color: "#176b58",
                          }}
                        >
                          {selectedAssessmentId ===
                          assessment.id
                            ? "Hide details"
                            : "Click to open assignment"}
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedAssessment && (
              <div
                style={{
                  ...panel,
                  marginTop: 20,
                }}
              >
                <h3>Selected Assessment Details</h3>

                <p>
                  <strong>Student:</strong>{" "}
                  {studentName(
                    selectedAssessment.student_id
                  )}
                </p>

                <p>
                  <strong>Assessment level:</strong>{" "}
                  {selectedAssessment.assessment_level}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <StatusBadge
                    value={selectedAssessment.status}
                  />
                </p>

                <p>
                  <strong>Assigned date:</strong>{" "}
                  {formatDate(
                    selectedAssessment.assigned_at
                  )}
                </p>

                <p>
                  <strong>Due date:</strong>{" "}
                  {formatDate(
                    selectedAssessment.due_date
                  )}
                </p>

                <p
                  style={{
                    color: "#667a74",
                    fontSize: 13,
                  }}
                >
                  {selectedAssessment.status === "submitted"
                    ? "Submitted for teacher review. Open the review to inspect responses and prepare feedback."
                    : selectedAssessment.status === "reviewed"
                      ? "This assessment has already been reviewed."
                      : "The parent can complete the assessment before teacher review."}
                </p>
                {["submitted", "reviewed"].includes(selectedAssessment.status) && (
                  <button
                    type="button"
                    style={primaryButton}
                    onClick={() => router.push("/teacher/assessment-review/" + selectedAssessment.id)}
                  >
                    {selectedAssessment.status === "submitted" ? "Open Teacher Review" : "View Reviewed Assessment"}
                  </button>
                )}
                {selectedAssessment.status === "reviewed" && (
                  <button
                    type="button"
                    style={{...primaryButton, background:"#0f4c5c", marginLeft:8, marginTop:8}}
                    onClick={() => router.push("/teacher/assessment-review/" + selectedAssessment.id + "#development-plan")}
                  >
                    Manage Student Development Plan (IDP)
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === "activities" && (
          <section>
            <h2>Learning Activities</h2>

            <div style={grid}>
              <div style={panel}>
                <h3>Create Learning Activity</h3>

                <form onSubmit={createActivity}>
                  <label htmlFor="activity-title">
                    Activity title *
                  </label>

                  <input
                    id="activity-title"
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    style={field}
                    placeholder="Enter activity title"
                    required
                  />

                  <div style={{ height: 18 }} />

                  <label htmlFor="activity-description">
                    Activity description
                  </label>

                  <textarea
                    id="activity-description"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    style={field}
                    rows={4}
                    placeholder="Instructions for student and parent"
                  />

                  <div style={{ height: 20 }} />

                  <button
                    type="submit"
                    style={primaryButton}
                    disabled={saving || !title.trim()}
                  >
                    {saving
                      ? "Saving..."
                      : "Create Activity"}
                  </button>
                </form>
              </div>

              <div style={panel}>
                <h3>Assign Learning Activity</h3>

                <form onSubmit={assignActivity}>
                  <label htmlFor="activity-student">
                    Select student *
                  </label>

                  <select
                    id="activity-student"
                    value={activityStudent}
                    onChange={(e) =>
                      setActivityStudent(e.target.value)
                    }
                    style={field}
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
                        {student.full_name} · {student.student_code}
                      </option>
                    ))}
                  </select>

                  <div style={{ height: 18 }} />

                  <label htmlFor="activity-select">
                    Select activity *
                  </label>

                  <select
                    id="activity-select"
                    value={selectedActivity}
                    onChange={(e) =>
                      setSelectedActivity(e.target.value)
                    }
                    style={field}
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

                  <div style={{ height: 18 }} />

                  <label htmlFor="activity-due">
                    Due date (optional)
                  </label>

                  <input
                    id="activity-due"
                    type="date"
                    value={activityDue}
                    onChange={(e) =>
                      setActivityDue(e.target.value)
                    }
                    style={field}
                  />

                  <div style={{ height: 20 }} />

                  <button
                    type="submit"
                    style={primaryButton}
                    disabled={
                      saving ||
                      !activityStudent ||
                      !selectedActivity
                    }
                  >
                    {saving
                      ? "Assigning..."
                      : "Assign Activity"}
                  </button>
                </form>
              </div>

              <div style={panel}>
                <h3>
                  My Learning Activities (
                  {activities.length})
                </h3>

                {activities.length === 0 ? (
                  <p>No activities created yet.</p>
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

                      <p
                        style={{
                          color: "#667a74",
                        }}
                      >
                        {activity.description ||
                          "No description"}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div style={panel}>
                <h3>
                  Activity Assignment History (
                  {activityAssignments.length})
                </h3>

                {activityAssignments.length === 0 ? (
                  <p>No activities assigned yet.</p>
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
                        <strong>
                          {activityTitle(
                            assignment.activity_id
                          )}
                        </strong>

                        <p>
                          Student:{" "}
                          {studentName(
                            assignment.student_id
                          )}
                        </p>

                        <p>
                          Assigned:{" "}
                          {formatDate(
                            assignment.assigned_at
                          )}
                        </p>

                        <p>
                          Due:{" "}
                          {formatDate(
                            assignment.due_date
                          )}
                        </p>

                        <StatusBadge
                          value={assignment.status}
                        />
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "students" && (
          <section>
            <h2>Students & Guardian Contacts</h2>

            <div style={grid}>
              <div style={panel}>
                <h3>
                  My Assigned Students (
                  {students.length})
                </h3>

                {students.length === 0 ? (
                  <p>No students assigned yet.</p>
                ) : (
                  students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() =>
                        setProfileId(student.id)
                      }
                      style={{
                        width: "100%",
                        display: "block",
                        textAlign: "left",
                        padding: 15,
                        marginBottom: 10,
                        borderRadius: 12,
                        border:
                          profileId === student.id
                            ? "2px solid #176b58"
                            : "1px solid #dce8e1",
                        background:
                          profileId === student.id
                            ? "#f2f8f4"
                            : "#ffffff",
                        color: "#183a35",
                        cursor: "pointer",
                      }}
                    >
                      <strong>
                        {student.full_name} · {student.student_code}
                      </strong>

                      <div
                        style={{
                          fontSize: 13,
                          marginTop: 6,
                        }}
                      >
                        Class:{" "}
                        {student.current_class ||
                          "Not available"}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          marginTop: 5,
                        }}
                      >
                        Level:{" "}
                        {getLevel(
                          student.current_class
                        ) || "Unknown"}
                      </div>

                      <div style={{ marginTop: 9 }}>
                        <StatusBadge
                          value={student.status}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div style={panel}>
                <h3>
                  Student 360° Profile
                </h3>

                {profileId&&<button type="button"
                  onClick={()=>router.push("/student/history/"+profileId)}
                  style={{...primaryButton,marginBottom:16,background:"#0f4c5c"}}>
                  View Student Development History
                </button>}
                <label htmlFor="profile-student">
                  Select student
                </label>

                <select
                  id="profile-student"
                  value={profileId}
                  onChange={(e) =>
                    setProfileId(e.target.value)
                  }
                  style={field}
                >
                  <option value="">
                    Choose a student
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.full_name} · {student.student_code} —{" "}
                      {student.current_class}
                    </option>
                  ))}
                </select>

                {!selectedProfile ? (
                  <p
                    style={{
                      color: "#667a74",
                      marginTop: 25,
                    }}
                  >
                    Select a student to view their
                    profile and guardian contact details.
                  </p>
                ) : (
                  <div style={{ marginTop: 22 }}>
                    <h3>
                      {selectedProfile.full_name} · {selectedProfile.student_code}
                    </h3>

                    <div
                      style={{
                        background: "#f2f8f4",
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <p>
                        <strong>
                          Student code:
                        </strong>{" "}
                        {selectedProfile.student_code ||
                          "Not available"}
                      </p>

                      <p>
                        <strong>
                          Date of birth:
                        </strong>{" "}
                        {formatDate(
                          selectedProfile.date_of_birth
                        )}
                      </p>

                      <p>
                        <strong>
                          Current class:
                        </strong>{" "}
                        {selectedProfile.current_class ||
                          "Not available"}
                      </p>

                      <p>
                        <strong>
                          Assessment level:
                        </strong>{" "}
                        {getLevel(
                          selectedProfile.current_class
                        ) || "Not available"}
                      </p>

                      <p>
                        <strong>
                          Preferred language:
                        </strong>{" "}
                        {selectedProfile.preferred_language ||
                          "Not available"}
                      </p>

                      <p>
                        <strong>Status:</strong>{" "}
                        {selectedProfile.status}
                      </p>
                    </div>

                    <section style={{marginTop:20}}>
                      <h3>Assessment & Activity History</h3>
                      <p>Reviewed assessments: {assessments.filter(a=>a.student_id===selectedProfile.id&&a.status==="reviewed").length} / {assessments.filter(a=>a.student_id===selectedProfile.id).length}</p>
                      <p>Completed activities: {activityAssignments.filter(a=>a.student_id===selectedProfile.id&&a.status==="completed").length} / {activityAssignments.filter(a=>a.student_id===selectedProfile.id).length}</p>
                      {assessments.filter(a=>a.student_id===selectedProfile.id).slice().sort((a,b)=>b.assigned_at.localeCompare(a.assigned_at)).map(a=><div key={a.id} style={{padding:10,borderBottom:"1px solid #dce8e1"}}>{formatDate(a.assigned_at)} · {a.assessment_level} · <StatusBadge value={a.status}/>{a.status==="reviewed"&&<button type="button" style={{...primaryButton,marginLeft:8}} onClick={()=>router.push("/assessment-report/"+a.id)}>Report</button>}</div>)}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                        <button type="button" style={primaryButton} onClick={()=>router.push("/teacher/idp?student="+encodeURIComponent(selectedProfile.id))}>Development plan</button>
                        
                      </div>
                    </section>
                    <h3 style={{ marginTop: 24 }}>
                      Parent / Guardian Details
                    </h3>

                    {profileGuardians.length === 0 ? (
                      <p style={{ color: "#667a74" }}>
                        No linked guardian details
                        available for this student.
                      </p>
                    ) : (
                      profileGuardians.map((guardian) => (
                        <div
                          key={guardian.parent_user_id}
                          style={{
                            border:
                              "1px solid #dce8e1",
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 12,
                          }}
                        >
                          <p>
                            <strong>
                              Guardian name:
                            </strong>{" "}
                            {guardian.guardian_name ||
                              "Not available"}
                          </p>

                          <p>
                            <strong>
                              Email address:
                            </strong>{" "}
                            {guardian.guardian_email ? (
                              <a
                                href={`mailto:${guardian.guardian_email}`}
                                style={{
                                  color: "#176b58",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {guardian.guardian_email}
                              </a>
                            ) : (
                              "Not provided"
                            )}
                          </p>

                          <p>
                            <strong>
                              WhatsApp number:
                            </strong>{" "}
                            {guardian.whatsapp_number ||
                              "Not available"}
                          </p>

                          {guardian.whatsapp_number && (
                            <p>
                              <a
                                href={`https://wa.me/${phoneDigits(
                                  guardian.whatsapp_number
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#176b58",
                                  fontWeight: 700,
                                }}
                              >
                                Open WhatsApp
                              </a>
                            </p>
                          )}

                          <p>
                            <strong>
                              Additional phone number:
                            </strong>{" "}
                            {guardian.additional_contact_number ||
                              "Not provided"}
                          </p>

                          {guardian.additional_contact_number && (
                            <p>
                              <a
                                href={`tel:${guardian.additional_contact_number}`}
                                style={{
                                  color: "#176b58",
                                  fontWeight: 700,
                                }}
                              >
                                Call additional number
                              </a>
                            </p>
                          )}

                          <p>
                            <strong>
                              Separate contact number:
                            </strong>{" "}
                            {guardian.contact_number_differs
                              ? "Yes"
                              : "No"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
