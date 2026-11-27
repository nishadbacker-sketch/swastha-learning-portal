"use client";

import { useRouter } from "next/navigation";

import type { ReactNode } from "react";
import StaffLiveDashboard from "./staff-live-dashboard";

import {StaffDashboardIcon,StaffMenuIcon} from "./staff-menu-icon";

export type StaffRole = "owner" | "admin" | "clinic_admin" | "teacher";

type Tool = { label: string; href: string; description: string };
type Summary = {label:string; value:string|number; onClick?:()=>void};
type Section = {id:string;label:string};
type Props = { role:StaffRole; name?:string; summary?:Summary[]; sections?:Section[]; activeSection?:string; onSectionChange?:(id:string)=>void; children?:ReactNode };

export const COMMON_TOOLS: Tool[] = [
  { label: "Students & Progress", href: "/staff/students", description: "One authorized record for each student, charts and reports" },
  { label: "Staff Action Center", href: "/staff/actions", description: "Reviews, upcoming sessions and coordination priorities" },
  { label: "Session Calendar & Reports", href: "/staff/operations", description: "Calendar, approvals, workload and CSV export" },
  { label: "Courses & Assessments", href: "/staff/courses", description: "Browse published assessments and courses" },
  { label: "Free Assessment Results", href: "/staff/free-assessment-results", description: "Review submitted 25-question screenings and SWA Student IDs" },
  { label: "In-Person Assessments", href: "/staff/in-person-assessments", description: "Record supervised assessments" },
  { label: "Certificates & Verification", href: "/staff/assessment-certificates", description: "Issue, download and verify approved certificates" },
  { label: "Student Coordination", href: "/teacher/coordination", description: "Student activities and team coordination" },
  { label: "Staff Notifications", href: "/staff/notifications", description: "Staff messages and notifications" }
];

export function roleTools(role: StaffRole): Tool[] {
  if (role === "teacher") return [
    { label: "Approved Progress Reports", href: "/teacher/student-progress", description: "Reviewed progress and activity tracking" },
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
export default function StaffToolsMenu({ role, name, summary = [], sections = [], activeSection, onSectionChange, children }: Props) {
  const router = useRouter();
  const tools = [...COMMON_TOOLS, ...roleTools(role)];
  const home=role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard";

  return (
    <>
      <aside aria-label="Staff navigation" className="swastha-staff-sidebar">
        <div className="swastha-staff-sidebar__brand">
          <img src="/swastha-learning-clinic-logo.png" alt="Swastha Learning Clinic — official logo" width={260} height={87}/>
          <span className="swastha-staff-sidebar__role">{role === "owner" ? "Owner" : role === "admin" ? "Super Admin" : role === "clinic_admin" ? "Clinic Admin" : "Teacher"} Workspace</span>
        </div>
        <nav aria-label="Staff dashboard home" className="swastha-staff-sidebar__home"><button type="button" className="swastha-staff-sidebar__home-link" aria-current="page" onClick={()=>router.push(home)}><StaffDashboardIcon/><span>Dashboard</span></button></nav>
        {sections.length>0&&<nav aria-label="Teacher dashboard sections" className="swastha-staff-sidebar__sections">
          {sections.map(item=><button type="button" key={item.id} aria-current={activeSection===item.id?"page":undefined}
            className={activeSection===item.id?"active":""} onClick={()=>onSectionChange?.(item.id)}>{item.label}</button>)}
        </nav>}
        <div className="swastha-staff-sidebar__tools">
          <h2>Staff Tools</h2>
          <nav aria-label="Role-based staff tools">
            {tools.map(tool=><button key={tool.href} type="button" className="swastha-staff-sidebar__tool" onClick={()=>router.push(tool.href)}>
              <StaffMenuIcon href={tool.href}/><span className="swastha-staff-sidebar__tool-copy"><strong>{tool.label}</strong><span>{tool.description}</span></span>
            </button>)}
          </nav>
          <div className="swastha-staff-sidebar__quick"><h3>Quick Actions</h3>
           <button type="button" onClick={()=>router.push(role==="teacher"?"/teacher/custom-assessments":"/staff/courses")}>Assign Assessment</button>
           <button type="button" onClick={()=>router.push(role==="teacher"?"/teacher/dashboard":"/staff/students")}>Learning Activities</button>
           <button type="button" onClick={()=>router.push(role==="teacher"?"/teacher/idp":"/staff/students")}>Development Plan</button>
           <button type="button" onClick={()=>router.push("/staff/assessment-certificates")}>Certificates</button>
          </div>
        </div>
      </aside>
      <section aria-label="Staff tools" className="swastha-staff-workspace swastha-staff-workspace--sidebar">
        <h1 className="swastha-staff-dashboard__visually-hidden">{name ? `Welcome, ${name}` : "Staff Dashboard"}</h1>
        <StaffLiveDashboard role={role}/>
        {children&&<div className="swastha-staff-workspace__extras">{children}</div>}
      </section>
    </>
  );
}
