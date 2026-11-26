"use client";

import { useRouter } from "next/navigation";

export type StaffRole = "owner" | "admin" | "clinic_admin" | "teacher";

type Tool = { label: string; href: string; description: string };
type Props = { role: StaffRole; name?: string };

const COMMON_TOOLS: Tool[] = [
  { label: "Students & Progress", href: "/staff/students", description: "One authorized record for each student, charts and reports" },
  { label: "Staff Action Center", href: "/staff/actions", description: "Reviews, upcoming sessions and coordination priorities" },
  { label: "Clinic Operations & Analytics", href: "/staff/operations", description: "Calendar, attendance and operational charts" },
  { label: "Courses & Assessments", href: "/staff/courses", description: "Browse published assessments and courses" },
  { label: "In-Person Assessments", href: "/staff/in-person-assessments", description: "Record supervised assessments" },
  { label: "Assessment Certificates", href: "/staff/assessment-certificates", description: "Review certificates within your permissions" },
  { label: "Student Coordination", href: "/teacher/coordination", description: "Student activities and team coordination" },
  { label: "Staff Notifications", href: "/staff/notifications", description: "Staff messages and notifications" }
];

function roleTools(role: StaffRole): Tool[] {
  if (role === "teacher") return [
    { label: "My Students & Analytics", href: "/teacher/dashboard#staff-analytics", description: "Assigned students and learning insights" },
    { label: "Student Progress", href: "/teacher/student-progress", description: "Approved progress and activity tracking" },
    { label: "Development Plans (IDP)", href: "/teacher/idp", description: "Individual development plans" },
    { label: "Assessment Builder", href: "/teacher/custom-assessments", description: "Create and assign custom assessments" },
    { label: "Sessions & Attendance", href: "/teacher/sessions", description: "Your permitted sessions" }
  ];
  const admin = role === "clinic_admin";
  return [
    { label: "Student Management", href: "/admin/students", description: "Student records and teacher assignments" },
    { label: "Sessions & Attendance", href: admin ? "/clinic-admin/sessions" : "/admin/sessions", description: "Clinic sessions and follow-up" },
    { label: "User Management", href: admin ? "/clinic-admin/users" : "/admin/users", description: "Manage accounts within your role" },
    { label: "Assessment Questions", href: "/admin/questions", description: "Question bank and authorized changes" },
    { label: "Audit Timeline", href: "/admin/audit", description: "Administrative activity history" },
    { label: "Announcements", href: "/admin/announcements", description: "Staff and family announcements" },
    ...(!admin ? [
      { label: "Assessment Oversight", href: "/admin/assessment-oversight", description: "Assessment operations and review" },
      { label: "Notification History", href: "/admin/notification-history", description: "Notification tracking" }
    ] : [])
  ];
}

/** One navigation definition for all staff dashboards. Individual routes and RLS still enforce permission. */
export default function StaffToolsMenu({ role, name }: Props) {
  const router = useRouter();
  const groups = [
    { title: "Common Staff Tools", tools: COMMON_TOOLS },
    { title: role === "teacher" ? "Teaching & Student Development" : "Administration & Student Records", tools: roleTools(role) }
  ];

  return (
    <section aria-label="Staff tools" className="swastha-staff-workspace">
      <div className="swastha-staff-workspace__heading">
        <div>
          <p className="swastha-staff-workspace__eyebrow">SWASTHA LEARNING CLINIC</p>
          <h1>Staff Workspace{name ? ` · ${name}` : ""}</h1>
          <p>One workspace for clinic services, students, assessments and progress. Access is based on your staff role.</p>
        </div>
        <span className="swastha-staff-workspace__role">{role === "owner" ? "Owner" : role === "admin" ? "Super Admin" : role === "clinic_admin" ? "Clinic Admin" : "Teacher"}</span>
      </div>
      {groups.map(group => (
        <div className="swastha-staff-workspace__group" key={group.title}>
          <h2>{group.title}</h2>
          <nav className="swastha-staff-workspace__grid" aria-label={group.title}>
            {group.tools.map(tool => (
              <button key={tool.href} type="button" className="swastha-staff-workspace__tool" onClick={() => router.push(tool.href)}>
                <strong>{tool.label}</strong>
                <span>{tool.description}</span>
              </button>
            ))}
          </nav>
        </div>
      ))}
    </section>
  );
}
