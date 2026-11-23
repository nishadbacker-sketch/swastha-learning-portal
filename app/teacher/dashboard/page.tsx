"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  BookOpen,
  ClipboardCheck,
  Users,
  BarChart3,
  Plus,
  Send,
  LogOut,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  Clock,
  Layers,
  Globe,
} from "lucide-react";

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

const LEVELS: { value: Level; label: string; short: string; color: string }[] = [
  { value: "LP", label: "LP — Classes 1–4", short: "Classes 1–4", color: "#176b58" },
  { value: "UP", label: "UP — Classes 5–7", short: "Classes 5–7", color: "#2563eb" },
  { value: "HS", label: "HS — Classes 8–10", short: "Classes 8–10", color: "#7c3aed" },
  { value: "HSS", label: "HSS — Classes 11–12", short: "Classes 11–12", color: "#d97706" },
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

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    assigned: "bg-blue-50 text-blue-700 ring-blue-600/20",
    in_progress: "bg-amber-50 text-amber-700 ring-amber-600/20",
    submitted: "bg-purple-50 text-purple-700 ring-purple-600/20",
    reviewed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
        styles[value] || "bg-slate-100 text-slate-700 ring-slate-500/20"
      }`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

/**
 * Pure SVG Donut Chart (Zero external dependencies for clean GitHub/Vercel builds)
 */
function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#e9efeb"
            strokeWidth="16"
          />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.value === 0) return null;
              const percent = seg.value / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercent * circumference;
              cumulativePercent += percent;

              return (
                <circle
                  key={seg.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-500"
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-[#183a35]">
            {centerValue}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#667a74]">
            {centerLabel}
          </span>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div
              key={seg.label}
              className="rounded-xl border border-[#dce8e1] bg-[#f8faf7] p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs font-medium text-[#667a74]">
                  {seg.label}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold text-[#183a35]">
                  {seg.value}
                </span>
                <span className="text-xs font-medium text-[#667a74]">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  const [activityAssignments, setActivityAssignments] = useState<ActivityAssignment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const [level, setLevel] = useState<Level>("LP");
  const [assessmentStudent, setAssessmentStudent] = useState("");
  const [assessmentDue, setAssessmentDue] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityStudent, setActivityStudent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [activityDue, setActivityDue] = useState("");

  const [activeTab, setActiveTab] = useState<
    "overview" | "assessments" | "activities" | "students"
  >("overview");

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
        ((guardianResult.data || []) as Guardian[]).filter((g) =>
          ids.includes(g.student_id)
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
    )
      return;

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
  const profileGuardians = guardians.filter((g) => g.student_id === profileId);
  const eligible = students.filter((s) => getLevel(s.current_class) === level);

  // Analytics calculations
  const assessmentStatuses = [
    { key: "assigned", label: "Assigned", color: "#2563eb" },
    { key: "in_progress", label: "In Progress", color: "#d97706" },
    { key: "submitted", label: "Submitted", color: "#7c3aed" },
    { key: "reviewed", label: "Reviewed", color: "#16805d" },
  ];

  const assessmentDonutSegments = assessmentStatuses.map((s) => ({
    label: s.label,
    value: assessments.filter((a) => a.status === s.key).length,
    color: s.color,
  }));

  const levelDistribution = LEVELS.map((l) => ({
    ...l,
    count: students.filter((s) => getLevel(s.current_class) === l.value).length,
  }));
  const maxLevelCount = Math.max(...levelDistribution.map((l) => l.count), 1);

  const activityCompletedCount = activityAssignments.filter(
    (a) => a.status === "completed" || a.status === "reviewed"
  ).length;
  const activityPendingCount = activityAssignments.length - activityCompletedCount;

  // Language distribution chart data
  const languageCounts = students.reduce<Record<string, number>>((acc, s) => {
    const lang = s.preferred_language?.trim() || "Unspecified";
    acc[lang] = (acc[lang] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faf7] text-[#183a35]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#176b58] border-t-transparent" />
          <p className="text-sm font-medium text-[#667a74]">
            Loading Swastha Teacher Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf7] text-[#183a35]">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 border-b border-[#dce8e1] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176b58] text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-wide text-[#183a35]">
                  SWASTHA LEARNING CLINIC
                </span>
                <span className="hidden rounded-full bg-[#e4f5ea] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#176b58] sm:inline-block">
                  LEARN • GROW • THRIVE
                </span>
              </div>
              <p className="text-xs text-[#667a74]">
                Welcome back, <strong className="text-[#183a35]">{teacherName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation Pills */}
            <nav className="flex rounded-xl border border-[#dce8e1] bg-[#f8faf7] p-1">
              {[
                { id: "overview", label: "Analytics", icon: BarChart3 },
                { id: "assessments", label: "Assessments", icon: ClipboardCheck },
                { id: "activities", label: "Activities", icon: BookOpen },
                { id: "students", label: "Students", icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                      active
                        ? "bg-[#176b58] text-white shadow-sm"
                        : "text-[#667a74] hover:text-[#183a35]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="flex items-center gap-1.5 rounded-xl border border-[#dce8e1] bg-white px-3 py-2 text-xs font-semibold text-[#183a35] transition hover:bg-[#f2f8f4]"
            >
              <LogOut className="h-4 w-4 text-[#667a74]" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Status & Error Alerts */}
        {message && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-[#e4f5ea] px-4 py-3 text-sm font-medium text-[#176b42]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-200 bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#b42318]"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* KPI Metric Strip */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#176b58] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              <span>Assigned Students</span>
              <Users className="h-4 w-4 text-[#176b58]" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#176b58]">
              {students.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#2563eb] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              <span>Learning Activities</span>
              <BookOpen className="h-4 w-4 text-[#2563eb]" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#2563eb]">
              {activities.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#7c3aed] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              <span>Assessments</span>
              <ClipboardCheck className="h-4 w-4 text-[#7c3aed]" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#7c3aed]">
              {assessments.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#d97706] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              <span>Pending Reviews</span>
              <Clock className="h-4 w-4 text-[#d97706]" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#d97706]">
              {assessments.filter((a) => a.status === "submitted").length}
            </div>
          </div>
        </section>

        {/* ================= TAB 1: ANALYTICS & CHARTS OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-
