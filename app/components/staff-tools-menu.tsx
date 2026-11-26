"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import StaffDashboardInsights from "./staff-dashboard-insights";

export type StaffRole = "owner" | "admin" | "clinic_admin" | "teacher";

type Tool = { label: string; href: string; description: string };
type Summary = {label:string; value:string|number; onClick?:()=>void; note?:string};
type MetricKind = "students"|"assessments"|"activities"|"progress"|"teachers"|"sessions"|"notifications";
function metricKind(label:string):MetricKind{
 const value=label.toLowerCase();
 if(/teacher|staff/.test(value))return "teachers";
 if(/student|child|registr/.test(value))return "students";
 if(/assessment|review/.test(value))return "assessments";
 if(/activit|course|learning/.test(value))return "activities";
 if(/session|appointment|enquir|follow.up|quer/.test(value))return "sessions";
 if(/notification|alert/.test(value))return "notifications";
 return "progress";
}
function MetricIcon({kind}:{kind:MetricKind}){
 const common={fill:"none",stroke:"currentColor",strokeWidth:2.1,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
 return <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false" {...common}>
  {kind==="students"||kind==="teachers"?<>
   <circle cx="16" cy="9" r="4"/><path d="M8 26v-4c0-5 3.3-8 8-8s8 3 8 8v4H8Z"/>
   <path d="M7 12a3 3 0 1 1 2-5M5 24H2v-4c0-2.6 1.5-5 4-6M25 12a3 3 0 1 0-2-5m4 17h3v-4c0-2.6-1.5-5-4-6"/>
  </>:kind==="assessments"?<>
   <rect x="7" y="6" width="18" height="23" rx="2"/><path d="M12 6V4h8v2M11 17l3 3 7-8M12 24h9"/>
  </>:kind==="activities"?<>
   <path d="M16 9C12 6 6 6 3 8v18c4-2 9-1 13 2 4-3 9-4 13-2V8c-3-2-9-2-13 1Zm0 0v19"/>
  </>:kind==="sessions"?<>
   <rect x="5" y="7" width="22" height="21" rx="2"/><path d="M10 4v6M22 4v6M5 13h22M10 19h4m4 0h4m-12 5h4"/>
  </>:kind==="notifications"?<>
   <path d="M10 25h12M7 22h18l-3-5v-5a6 6 0 0 0-12 0v5l-3 5ZM14 28h4"/>
  </>:<>
   <path d="M5 27V17h5v10M14 27V11h5v16M23 27V5h5v22M4 28h25"/>
  </>}
 </svg>;
}
type Section = {id:string;label:string};
type Props = { role:StaffRole; name?:string; summary?:Summary[]; sections?:Section[]; activeSection?:string; onSectionChange?:(id:string)=>void; children?:ReactNode };

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
  const [search,setSearch]=useState("");
  const tools = [...COMMON_TOOLS, ...roleTools(role)];

  return (
    <>
      <aside aria-label="Staff navigation" className="swastha-staff-sidebar">
        <div className="swastha-staff-sidebar__brand">
          <img src="/swastha-learning-clinic-logo.png" alt="Swastha Learning Clinic — official logo" width={260} height={87}/>
          <span className="swastha-staff-sidebar__role">{role === "owner" ? "Owner" : role === "admin" ? "Super Admin" : role === "clinic_admin" ? "Clinic Admin" : "Teacher"} Workspace</span>
        </div>
        {sections.length>0&&<nav aria-label="Teacher dashboard sections" className="swastha-staff-sidebar__sections">
          {sections.map(item=><button type="button" key={item.id} aria-current={activeSection===item.id?"page":undefined}
            className={activeSection===item.id?"active":""} onClick={()=>onSectionChange?.(item.id)}>{item.label}</button>)}
        </nav>}
        <div className="swastha-staff-sidebar__tools">
          <h2>Staff Tools</h2>
          <nav aria-label="Role-based staff tools">
            {tools.map(tool=><button key={tool.href} type="button" className="swastha-staff-sidebar__tool" onClick={()=>router.push(tool.href)}>
              <strong>{tool.label}</strong>
              <span>{tool.description}</span>
            </button>)}
          </nav>
        </div>
      </aside>
      <section aria-label="Staff tools" className="swastha-staff-workspace swastha-staff-workspace--sidebar">
        <div className="swastha-staff-workspace__heading">
          <div>
            <p className="swastha-staff-workspace__eyebrow">SWASTHA LEARNING CLINIC</p>
            <h1>{name ? `Welcome, ${name}` : "Staff Dashboard"}</h1>
            <p>Your learning, assessment and clinic coordination workspace.</p>
          </div>
          <form className="swastha-staff-dashboard-search" role="search" onSubmit={event=>{event.preventDefault();if(search.trim())router.push("/staff/students?search="+encodeURIComponent(search.trim()));}}>
            <label htmlFor="staff-dashboard-search">Search students</label>
            <div><input id="staff-dashboard-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Student name or permanent ID" autoComplete="off"/><button type="submit" disabled={!search.trim()} aria-label="Search student directory">Search</button></div>
          </form>
        </div>
        <StaffDashboardInsights role={role}/>
        {summary.length>0&&<h2 className="swastha-staff-dashboard-secondary-heading">Additional Staff Metrics</h2>}
        {summary.length>0&&<div className="swastha-staff-workspace__summary" aria-label="Dashboard summary">
          {summary.map(item=><div key={item.label} className="swastha-staff-workspace__metric">
            {item.onClick?<button type="button" onClick={item.onClick} className="swastha-staff-workspace__metric-button">
              <span className="swastha-staff-workspace__metric-icon"><MetricIcon kind={metricKind(item.label)}/></span>
              <span className="swastha-staff-workspace__metric-copy"><span className="swastha-staff-workspace__metric-label">{item.label}</span><strong className="swastha-staff-workspace__metric-value">{item.value}</strong>{item.note&&<small>{item.note}</small>}</span>
            </button>:<div className="swastha-staff-workspace__metric-static">
              <span className="swastha-staff-workspace__metric-icon"><MetricIcon kind={metricKind(item.label)}/></span>
              <span className="swastha-staff-workspace__metric-copy"><span className="swastha-staff-workspace__metric-label">{item.label}</span><strong className="swastha-staff-workspace__metric-value">{item.value}</strong>{item.note&&<small>{item.note}</small>}</span>
            </div>}
          </div>)}
        </div>}
        {children&&<div className="swastha-staff-workspace__extras">{children}</div>}
      </section>
    </>
  );
}
