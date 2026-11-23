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

  const number = /^\d{1,2}$/.test(cleaned) ? Number(cleaned) : roman[cleaned];
  if (!number || number < 1 || number > 12) return null;
  if (number <= 4) return "LP";
  if (number <= 7) return "UP";
  if (number <= 10) return "HS";
  return "HSS";
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const parts = value.slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
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
    if (!supabase || !userId || !activityStudent || !selectedActivity || saving)
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
      <header className="sticky top-0 z-20 border-b border-[#dce8e1] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176b58] font-bold text-white shadow-sm">
              S
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
            <nav className="flex rounded-xl border border-[#dce8e1] bg-[#f8faf7] p-1">
              {[
                { id: "overview", label: "Analytics" },
                { id: "assessments", label: "Assessments" },
                { id: "activities", label: "Activities" },
                { id: "students", label: "Students" },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                      active
                        ? "bg-[#176b58] text-white shadow-sm"
                        : "text-[#667a74] hover:text-[#183a35]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#183a35] transition hover:bg-[#f2f8f4]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-[#e4f5ea] px-4 py-3 text-sm font-medium text-[#176b42]"
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#b42318]"
          >
            {errorMessage}
          </div>
        )}

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#176b58] bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              Assigned Students
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#176b58]">
              {students.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#2563eb] bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              Learning Activities
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#2563eb]">
              {activities.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#7c3aed] bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              Assessments
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#7c3aed]">
              {assessments.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce8e1] border-t-4 border-t-[#d97706] bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#667a74]">
              Pending Reviews
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#d97706]">
              {assessments.filter((a) => a.status === "submitted").length}
            </div>
          </div>
        </section>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-[#183a35]">
                    Assessment Pipeline Breakdown
                  </h2>
                  <p className="text-xs text-[#667a74]">
                    Assignment counts by workflow stage (private scores excluded)
                  </p>
                </div>

                <DonutChart
                  segments={assessmentDonutSegments}
                  centerLabel="Total"
                  centerValue={assessments.length}
                />
              </div>

              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-[#183a35]">
                    Students by Grade Level
                  </h2>
                  <p className="text-xs text-[#667a74]">
                    Distribution across LP, UP, HS, and HSS cohorts
                  </p>
                </div>

                <div className="space-y-4">
                  {levelDistribution.map((lvl) => {
                    const widthPct =
                      students.length > 0
                        ? Math.max(
                            (lvl.count / maxLevelCount) * 100,
                            lvl.count > 0 ? 8 : 0
                          )
                        : 0;
                    return (
                      <div key={lvl.value}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-bold text-[#183a35]">
                            {lvl.value}{" "}
                            <span className="font-normal text-[#667a74]">
                              ({lvl.short})
                            </span>
                          </span>
                          <span className="font-bold text-[#183a35]">
                            {lvl.count} {lvl.count === 1 ? "student" : "students"}
                          </span>
                        </div>
                        <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#e9efeb]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: lvl.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#183a35]">
                  Learning Activity Completion Rate
                </h2>
                <p className="mb-5 text-xs text-[#667a74]">
                  Tracks assigned modules completed vs. pending across your roster
                </p>

                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-[#176b58]">
                      {activityAssignments.length > 0
                        ? Math.round(
                            (activityCompletedCount /
                              activityAssignments.length) *
                              100
                          )
                        : 0}
                      %
                    </span>
                    <span className="ml-2 text-xs text-[#667a74]">
                      completed ({activityCompletedCount} of{" "}
                      {activityAssignments.length})
                    </span>
                  </div>
                </div>

                <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#e9efeb]">
                  {activityAssignments.length > 0 && (
                    <>
                      <div
                        className="bg-[#176b58] transition-all duration-500"
                        style={{
                          width: `${
                            (activityCompletedCount /
                              activityAssignments.length) *
                            100
                          }%`,
                        }}
                      />
                      <div
                        className="bg-amber-400 transition-all duration-500"
                        style={{
                          width: `${
                            (activityPendingCount /
                              activityAssignments.length) *
                            100
                          }%`,
                        }}
                      />
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-6 text-xs text-[#667a74]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#176b58]" />
                    Completed / Reviewed ({activityCompletedCount})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    Pending / Active ({activityPendingCount})
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-[#183a35]">
                    Student Preferred Languages
                  </h2>
                  <p className="text-xs text-[#667a74]">
                    Helps tailor bilingual instructions and parent communication
                  </p>
                </div>

                {Object.keys(languageCounts).length === 0 ? (
                  <p className="text-sm text-[#667a74]">No student data yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(languageCounts).map(([lang, count]) => (
                      <div
                        key={lang}
                        className="rounded-xl border border-[#dce8e1] bg-[#f2f8f4] p-3.5"
                      >
                        <div className="text-xs font-semibold text-[#667a74]">
                          {lang}
                        </div>
                        <div className="mt-1 text-2xl font-extrabold text-[#176b58]">
                          {count}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "assessments" && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="text-base font-bold text-[#183a35]">
                Assign Grade-Based Assessment
              </h2>
              <p className="mb-5 text-xs text-[#667a74]">
                Select a cohort level to filter eligible students automatically.
              </p>

              <form onSubmit={assignAssessment} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#667a74]">
                    Assessment Level *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEVELS.map((l) => {
                      const selected = level === l.value;
                      return (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => {
                            setLevel(l.value);
                            setAssessmentStudent("");
                          }}
                          className={`rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-[#176b58] bg-[#e4f5ea]/60 ring-2 ring-[#176b58]/20"
                              : "border-[#dce8e1] bg-white hover:bg-[#f8faf7]"
                          }`}
                        >
                          <div className="text-sm font-extrabold text-[#183a35]">
                            {l.value}
                          </div>
                          <div className="text-[11px] text-[#667a74]">
                            {l.short}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="assessment-student"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667a74]"
                  >
                    Select Eligible Student *
                  </label>
                  <select
                    id="assessment-student"
                    value={assessmentStudent}
                    onChange={(e) => setAssessmentStudent(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
                  >
                    <option value="">Choose a student...</option>
                    {eligible.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} — {s.current_class}
                      </option>
                    ))}
                  </select>
                  {eligible.length === 0 && (
                    <p className="mt-1.5 text-xs font-medium text-amber-700">
                      No assigned students match {level}.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="assessment-due"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667a74]"
                  >
                    Due Date (Optional)
                  </label>
                  <input
                    id="assessment-due"
                    type="date"
                    value={assessmentDue}
                    onChange={(e) => setAssessmentDue(e.target.value)}
                    className="w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || !assessmentStudent}
                  className="w-full rounded-xl bg-[#176b58] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125546] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Assigning..." : `Assign ${level} Assessment`}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm lg:col-span-3">
              <h2 className="mb-4 text-base font-bold text-[#183a35]">
                Assessment Assignment History ({assessments.length})
              </h2>

              {assessments.length === 0 ? (
                <p className="rounded-xl bg-[#f8faf7] p-6 text-center text-sm text-[#667a74]">
                  No assessments assigned yet.
                </p>
              ) : (
                <div className="divide-y divide-[#dce8e1]">
                  {assessments.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#183a35]">
                            {studentName(a.student_id)}
                          </span>
                          <span className="rounded-md bg-[#f2f8f4] px-2 py-0.5 text-xs font-bold text-[#176b58]">
                            {a.assessment_level}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#667a74]">
                          <span>Assigned: {formatDate(a.assigned_at)}</span>
                          <span>•</span>
                          <span>Due: {formatDate(a.due_date)}</span>
                        </div>
                        {a.status === "submitted" && (
                          <p className="mt-1.5 text-xs font-medium text-purple-700">
                            Awaiting teacher review. Review controls will be added next.
                          </p>
                        )}
                      </div>
                      <StatusBadge value={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "activities" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#183a35]">
                  Create Learning Activity
                </h2>
                <p className="mb-5 text-xs text-[#667a74]">
                  Build a reusable activity module in your library.
                </p>

                <form onSubmit={createActivity} className="space-y-4">
                  <div>
                    <label
                      htmlFor="activity-title"
                      className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667a74]"
                    >
                      Activity Title *
                    </label>
                    <input
                      id="activity-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Reading Comprehension — Level 2"
                      required
                      className="w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="activity-description"
                      className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667a74]"
                    >
                      Activity Description
                    </label>
                    <textarea
                      id="activity-description"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Instructions for the student and parent..."
                      className="w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !title.trim()}
                    className="w-full rounded-xl bg-[#176b58] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125546] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Create Activity"}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#183a35]">
                  Assign Learning Activity
                </h2>
                <p className="mb-5 text-xs text-[#667a74]">
                  Assign any saved activity to a student with an optional due date.
                </p>

                <form onSubmit={assignActivity} className="space-y-4">
                  <div>
                    <label
                      htmlFor="activity-student"
                      className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667a74]"
                    >
                      Select Student *
                    </label>
                    <select
                      id="activity-student"
                      value={activityStudent}
                      onChange={(e) => setActivityStudent(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
                    >
                      <option value="">Choose a student...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="selected-activity"
                      className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667a74]"
                    >
                      Select Activity *
                    </label>
                    <select
                      id="selected-activity"
                      value={selectedActivity}
                      onChange={(e) => setSelectedActivity(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
                    >
                      <option value="">Choose an activity...</option>
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="activity-due"
                      className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#667a74]"
                    >
                      Due Date (Optional)
                    </label>
                    <input
                      id="activity-due"
                      type="date"
                      value={activityDue}
                      onChange={(e) => setActivityDue(e.target.value)}
                      className="w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !activityStudent || !selectedActivity}
                    className="w-full rounded-xl bg-[#176b58] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125546] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Assigning..." : "Assign Activity"}
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-bold text-[#183a35]">
                  My Learning Activities ({activities.length})
                </h2>
                {activities.length === 0 ? (
                  <p className="text-sm text-[#667a74]">
                    No activities created yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#dce8e1]">
                    {activities.map((a) => (
                      <div key={a.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="font-bold text-[#183a35]">{a.title}</div>
                        <p className="mt-1 text-xs text-[#667a74]">
                          {a.description || "No description"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-bold text-[#183a35]">
                  Activity Assignment History ({activityAssignments.length})
                </h2>
                {activityAssignments.length === 0 ? (
                  <p className="text-sm text-[#667a74]">
                    No activities assigned yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#dce8e1]">
                    {activityAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                      >
                        <div>
                          <div className="font-bold text-[#183a35]">
                            {activityTitle(a.activity_id)}
                          </div>
                          <p className="mt-0.5 text-xs text-[#667a74]">
                            Student: {studentName(a.student_id)} • Due:{" "}
                            {formatDate(a.due_date)}
                          </p>
                        </div>
                        <StatusBadge value={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-base font-bold text-[#183a35]">
                My Assigned Students ({students.length})
              </h2>

              {students.length === 0 ? (
                <p className="text-sm text-[#667a74]">
                  No students assigned yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {students.map((s) => {
                    const selected = profileId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setProfileId(s.id)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${
                          selected
                            ? "border-[#176b58] bg-[#f2f8f4] ring-2 ring-[#176b58]/20"
                            : "border-[#dce8e1] bg-white hover:bg-[#f8faf7]"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[#183a35]">
                            {s.full_name}
                          </div>
                          <div className="mt-0.5 text-xs text-[#667a74]">
                            {s.current_class || "Class not set"} • Level:{" "}
                            <strong className="text-[#176b58]">
                              {getLevel(s.current_class) || "Unknown"}
                            </strong>
                          </div>
                        </div>
                        <StatusBadge value={s.status} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-sm lg:col-span-3">
              <div className="mb-4">
                <h2 className="text-base font-bold text-[#183a35]">
                  Student Profile & Guardian Contact Details
                </h2>
                <p className="text-xs text-[#667a74]">
                  Select a student from the list or dropdown to inspect details.
                </p>
              </div>

              <select
                id="profile-student"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="mb-6 w-full rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2.5 text-sm text-[#183a35] focus:border-[#176b58] focus:outline-none focus:ring-2 focus:ring-[#176b58]/20"
              >
                <option value="">Choose a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} — {s.current_class || "Class not set"}
                  </option>
                ))}
              </select>

              {!profile ? (
                <div className="rounded-2xl border border-dashed border-[#dce8e1] bg-[#f8faf7] py-12 text-center">
                  <p className="text-sm font-medium text-[#667a74]">
                    Pick any student to view their academic & guardian records.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-[#183a35]">
                      {profile.full_name}
                    </h3>
                    <StatusBadge value={profile.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f2f8f4] p-4 sm:grid-cols-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667a74]">
                        Student Code
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-[#183a35]">
                        {profile.student_code || "Not available"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667a74]">
                        Date of Birth
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-[#183a35]">
                        {formatDate(profile.date_of_birth)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667a74]">
                        Current Class
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-[#183a35]">
                        {profile.current_class || "Not available"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667a74]">
                        Assessment Level
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-[#176b58]">
                        {getLevel(profile.current_class) || "Not available"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667a74]">
                        Preferred Language
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-[#183a35]">
                        {profile.preferred_language || "Not available"}
                      </p>
                    </div>
                  </div>

                  <h4 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-[#667a74]">
                    Parent / Guardian Details
                  </h4>

                  {profileGuardians.length === 0 ? (
                    <p className="text-sm text-[#667a74]">
                      No linked guardian details available for this student.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {profileGuardians.map((g) => (
                        <div
                          key={g.parent_user_id}
                          className="rounded-xl border border-[#dce8e1] bg-white p-4"
                        >
                          <div className="font-bold text-[#183a35]">
                            {g.guardian_name || "Guardian Name Not Available"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            {g.whatsapp_number ? (
                              <a
                                href={`https://wa.me/${g.whatsapp_number.replace(
                                  /[^0-9]/g,
                                  ""
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-lg bg-[#e4f5ea] px-3 py-1.5 font-semibold text-[#176b58] transition hover:bg-[#d2eedc]"
                              >
                                WhatsApp: {g.whatsapp_number}
                              </a>
                            ) : (
                              <span className="text-[#667a74]">
                                WhatsApp: Not available
                              </span>
                            )}

                            {g.additional_contact_number && (
                              <a
                                href={`tel:${g.additional_contact_number}`}
                                className="inline-flex items-center rounded-lg border border-[#dce8e1] px-3 py-1.5 font-semibold text-[#183a35] hover:bg-[#f8faf7]"
                              >
                                Alt: {g.additional_contact_number}
                              </a>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-[#667a74]">
                            Separate contact number:{" "}
                            <strong>
                              {g.contact_number_differs ? "Yes" : "No"}
                            </strong>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
